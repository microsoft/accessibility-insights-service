# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

export resourceGroupName
export batchAccountName
export pool

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -a <batch account> -p <batch pool>
"
    exit 1
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
fi

# Get Batch pool Azure VMSS resource group and name
echo "Retrieving '$pool' Batch pool VMSS configuration"
query="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName']"
vmssResourceGroup=$(az vmss list --query "$query.resourceGroup" -o tsv)
vmssName=$(az vmss list --query "$query.name" -o tsv)

if [[ -z $vmssResourceGroup ]] || [[ -z $vmssName ]]; then
    echo "The '$batchAccountName' Azure Batch account has no VMSS created for the '$pool' pool"
    exit 1
fi

# Enable system-assigned managed identity on a VMSS
echo "Enabling system-assigned managed identity on /resourceGroups/$vmssResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/$vmssName"
systemAssignedIdentity=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)

echo \
    "Batch pool VMSS configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $systemAssignedIdentity"
