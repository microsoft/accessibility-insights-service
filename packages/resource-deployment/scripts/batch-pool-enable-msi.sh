#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# export vmssResourceGroups
# export systemAssignedIdentities

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -a <batch account> -p <batch pool>
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
        IFS=$',' read -ra vmssResourceGroups <<< "$vmssResourceGroupsStr"
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
    for vmssResourceGroup in "${vmssResourceGroups[@]}"; do
        echo "Enabling system-assigned managed identity for VMSS resource group $vmssResourceGroup"
        vmssNameQuery="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName' && resourceGroup=='$vmssResourceGroup'].name"
        vmssName=$(az vmss list --query "$vmssNameQuery" -o tsv)

        systemAssignedIdentity=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)
        systemAssignedIdentities+=($systemAssignedIdentity)

        echo \
"VMSS Resource configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $systemAssignedIdentity
"
    done
}

# Read script arguments
while getopts "r:a:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    a) batchAccountName=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $batchAccountName ]] || [[ -z $pool ]]; then
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
assignSystemIdentity
