#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export vmssResourceGroup
export vmssName
export vmssLocation

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -p <batch pool> -c <command to execute> -n <command name>
"
    exit 1
}

getPoolNodeCount() {
    dedicatedNodes=$(az batch pool show --pool-id "$pool" --query "targetDedicatedNodes" -o tsv)
    lowPriorityNodes=$(az batch pool show --pool-id "$pool" --query "targetLowPriorityNodes" -o tsv)
    poolNodeCount=$((dedicatedNodes + lowPriorityNodes))
    echo "Pool $pool has $poolNodeCount VM node(s) deployed."
}

getVmssInfo() {
    # Azure Batch hosts up to 50 nodes on a single VMSS resource
    # Calculate expected number of VMSS resources
    maxNodeCount=50
    vmssCount=$(((poolNodeCount + maxNodeCount - 1) / maxNodeCount))

    # Get list of created VMSS resources
    vmssResourceGroupsQuery="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName'].resourceGroup"
    vmssResourceGroups=$(az vmss list --query "$vmssResourceGroupsQuery" -o tsv)

    echo "Expected $vmssCount VMSS resource(s) for $pool pool. Deployed resource(s):
$vmssResourceGroups"
}

setupVmss() {
    for vmssResourceGroup in $vmssResourceGroups; do
        local vmssResourceGroup="${vmssResourceGroup//[$'\t\r\n ']/}"

        echo "Waiting for $pool pool's VMSS $vmssResourceGroup resource group deployment"
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "az group exists --name $vmssResourceGroup"

        echo "Waiting for $pool pool's VMSS deployment"
        vmssQueryConditions="?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName' && resourceGroup=='$vmssResourceGroup'"
        vmssDeployedSearchPattern="[$vmssQueryConditions && provisioningState=='Succeeded'].name"
        vmssCreatedQuery="az vmss list --query \"$vmssDeployedSearchPattern\" -o tsv"
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "$vmssCreatedQuery"

        # Set exported variables
        vmssName=$(az vmss list --query "[$vmssQueryConditions].name" -o tsv)
        vmssLocation=$(az vmss list --query "[$vmssQueryConditions].location" -o tsv)

        echo "Running command for $pool pool's VMSS resource group $vmssResourceGroup. Command description:
  $commandName"
        eval "$command"
    done
}

. "${0%/*}/get-resource-names.sh"

echo "Invoked command on VMSS pool:
  Resource group: $resourceGroupName
  Batch: $batchAccountName
  Pool: $pool
  Key Vault: $keyVault
  Command description: $commandName
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

if [[ -z $resourceGroupName ]] || [[ -z $batchAccountName ]] || [[ -z $pool ]] || [[ -z $keyVault ]] || [[ -z $command ]] || [[ -z $commandName ]]; then
    exitWithUsageInfo
fi

# Validate Azure Batch account for the user subscription pool allocation mode
echo "Validating $batchAccountName Azure Batch account configuration..."
poolAllocationMode=$(az batch account show --name "$batchAccountName" --resource-group "$resourceGroupName" --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "The $batchAccountName Azure Batch account with $poolAllocationMode pool allocation mode is not supported."
    echo "Supported pool allocation mode: User Subscription."
    exit 1
fi

# Get total pool node count
getPoolNodeCount

# Get Batch pool Azure VMSS resource group and name
getVmssInfo

# Invoke command on each VMSS
setupVmss
