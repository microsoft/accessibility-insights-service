#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# export vmssResourceGroups
# export systemAssignedIdentities

export vmssResourceGroup
export vmssName
export vmssLocation

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -p <batch pool> -c <command to execute> -n <command name>
"
    exit 1
}

getPoolNodeCount() {
    echo "Retrieving information about the '$pool' Batch pool"

    dedicatedNodes=$(az batch pool show --pool-id "$pool" --query "targetDedicatedNodes" -o tsv)
    lowPriorityNodes=$(az batch pool show --pool-id "$pool" --query "targetLowPriorityNodes" -o tsv)
    poolNodeCount=$((dedicatedNodes + lowPriorityNodes))
    echo "  Pool nodes total $poolNodeCount"
}

getVmssInfo() {
    echo "Retrieving information about the '$pool' Batch pool VMSS resources"

    # Azure Batch hosts up to 50 nodes on a single VMSS resource
    # Calculate expected number of VMSS resources
    maxNodeCount=50
    vmssCount=$(((poolNodeCount + maxNodeCount - 1) / maxNodeCount))
    echo "  Pool VMSS resources total $vmssCount"

    vmssResourceGroupsQuery="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName'].resourceGroup"

    waiting=false
    end=$((SECONDS + 600))
    while [ $SECONDS -le $end ]; do
        vmssResourceGroupsStr=$(az vmss list --query "$vmssResourceGroupsQuery" -o tsv | tr "\n" ",")
        IFS=$',' read -ra vmssResourceGroups <<<"$vmssResourceGroupsStr"
        currentVmssCount=$((${#vmssResourceGroups[@]}))

        if [ $currentVmssCount -ge $vmssCount ]; then
            break
        fi

        if [ "$waiting" != true ]; then
            waiting=true
            echo "Waiting for the '$pool' Batch pool VMSS resources deployment"
            printf " - Running .."
        fi

        sleep 5
        printf "."
    done
    [ "$waiting" = true ] && echo " ended"

    # Validate result if timed out
    if [ $currentVmssCount -lt $vmssCount ]; then
        echo "The '$batchAccountName' Azure Batch account has no VMSS resources deployed for the '$pool' Batch pool"
        exit 1
    fi

    echo \
        "VMSS resource groups:"

    for vmssResourceGroup in "${vmssResourceGroups[@]}"; do
        echo "  $vmssResourceGroup"
    done
    echo ""
}

setupVmss() {
    for vmssResourceGroup in "${vmssResourceGroups[@]}"; do
        echo "Running setup for VMSS resource group $vmssResourceGroup for pool $pool"

        # Wait until we are certain the resource group exists
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "az group exists --name $vmssResourceGroup"

        vmssQueryConditions="?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName' && resourceGroup=='$vmssResourceGroup'"
        vmssDeployedQuery="[$vmssQueryConditions && provisioningState!='Creating' && provisioningState!='Updating'].name"
        vmssCreatedCommand="az vmss list --query \"$vmssDeployedQuery\" -o tsv"
        
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "$vmssCreatedCommand"

        vmssName=$(az vmss list --query "[$vmssQueryConditions].name" -o tsv)
        vmssLocation=$(az vmss list --query "[$vmssQueryConditions].location" -o tsv)
       
        echo "Checking vmss status - $vmssName"
        vmssStatus=$(az vmss list --query "[$vmssQueryConditions].provisioningState" -o tsv)
        if [ "$vmssStatus" != "Succeeded" ]; then
            echo "Deployment of vmss $vmssName failed with status $vmssStatus"
            exit 1
        fi

        echo "Invoking command $commandName"
        eval "$command"

    done
}
. "${0%/*}/set-resource-names.sh"

echo "inside pool setup"
echo "
resource group:$resourceGroupName
batch:$batchAccountName
pool:$pool
keyVault: $keyVault
commandName: $commandName
"
# Read script arguments
while getopts ":r:p:c:n:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    c) command=${OPTARG} ;;
    n) commandName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $batchAccountName ]] || [[ -z $pool ]] || [[ -z $keyVault ]] ||  [[ -z $command ]] ||  [[ -z $commandName ]]; then
    exitWithUsageInfo
fi

# Validate Azure Batch account for the user subscription pool allocation mode
echo "Validating '$batchAccountName' Azure Batch account configuration"
poolAllocationMode=$(az batch account show --name "$batchAccountName" --resource-group "$resourceGroupName" --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "ERROR: The '$batchAccountName' Azure Batch account with '$poolAllocationMode' pool allocation mode is not supported."
    exit 1
else
    echo "  Valid pool allocation mode $poolAllocationMode"
fi

# Get total pool node count
getPoolNodeCount

# Get Batch pool Azure VMSS resource group and name
getVmssInfo

# Invoke command on each vmss
setupVmss
