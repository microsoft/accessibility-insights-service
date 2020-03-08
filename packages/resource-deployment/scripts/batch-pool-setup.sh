#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# export vmssResourceGroups
# export systemAssignedIdentities

# Set default ARM template file
configureMonitoreForVmssTemplateFile="${0%/*}/../templates/configure-vmss-insights.template.json"
checkVmssStatusBeforeSetup=true

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -a <batch account> -p <batch pool> -w <log analytics workspace Id> -k <kevault name>
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

assignSystemIdentity() {
    local vmssResourceGroup=$1
    local vmssName=$2

    principalId=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)
    systemAssignedIdentities+=("$principalId")

    echo \
        "VMSS Resource configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $principalId
  "
    
    . "${0%/*}/key-vault-enable-msi.sh"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableAzureMonitor() {
    local vmssResourceGroup=$1
    local vmssName=$2
    local vmssLocation=$3

    echo "Waiting for vmss $vmssName to be in Succeeded state"
    az vmss wait --updated --timeout 1800 --name "$vmssName" --resource-group "$vmssResourceGroup"
    
    # Instead of sleep, We may need to look up batch pool nodes & then wait till startup task is completed
    echo "Sleep for 600 seconds"
    sleep 600

    echo "Enabling azure monitor on $vmssName for pool $pool"
    command=". ${0%/*}/enable-azure-monitor-vmss.sh"
    maxRetryCount=5
    retryWaitTimeInSeconds=180
    . "${0%/*}/run-with-retry.sh"

    echo "Successfully Enabled Azure Monitor on $vmssName under pool $pool"
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
       
        if [[ $checkVmssStatusBeforeSetup == true ]]; then
            echo "Checking vmss status - $vmssName"
            vmssStatus=$(az vmss list --query "[$vmssQueryConditions].provisioningState" -o tsv)
            if [ "$vmssStatus" != "Succeeded" ]; then
                echo "Deployment of vmss $vmssName failed with status $vmssStatus"
                exit 1
            fi
        fi

        assignSystemIdentity "$vmssResourceGroup" "$vmssName"

        enableAzureMonitor "$vmssResourceGroup" "$vmssName" "$vmssLocation"

    done
}

# Read script arguments
while getopts ":r:a:p:w:k:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    a) batchAccountName=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    w) logAnalyticsWorkspaceId=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $batchAccountName ]] || [[ -z $pool ]] || [[ -z $logAnalyticsWorkspaceId ]] || [[ -z $keyVault ]]; then
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

# Enable system-assigned managed identity on VMSS resources
setupVmss
