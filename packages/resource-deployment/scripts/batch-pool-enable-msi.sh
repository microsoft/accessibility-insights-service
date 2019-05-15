#!/bin/bash
set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# Read script arguments
while getopts "r:a:p:" option; do
case $option in
    r) resourceGroup=${OPTARG};;
    a) account=${OPTARG};;
    p) pool=${OPTARG};;
esac
done

if [[ -z $resourceGroup ]] || [[ -z $account ]] || [[ -z $pool ]]; then
    echo \
"
Usage: $0 -r <resource group> -a <batch account> -p <batch pool>
"
    exit 1
fi

# Validate Azure Batch account for the user subscription pool allocation mode
echo "Validating '$account' Azure Batch account configuration"
poolAllocationMode=$(az batch account show --name $account --resource-group $resourceGroup --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "ERROR: The '$account' Azure Batch account with '$poolAllocationMode' pool allocation mode is not supported."
    exit 1
fi

# Get Batch pool Azure VMSS resource group and name
echo "Retrieving '$pool' Batch pool VMSS configuration"
query="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$account']"
vmssResourceGroup=$(az vmss list --query "$query.resourceGroup" -o tsv)
vmssName=$(az vmss list --query "$query.name" -o tsv)

if [[ -z $vmssResourceGroup ]] || [[ -z $vmssName ]]; then
    echo "The '$account' Azure Batch account has no VMSS created for the '$pool' pool"
    exit 1
fi

# Enable system-assigned managed identity on a VMSS
echo "Enabling system-assigned managed identity on /resourceGroups/$vmssResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/$vmssName"
systemAssignedIdentity=$(az vmss identity assign --name $vmssName --resource-group $vmssResourceGroup --query systemAssignedIdentity -o tsv)

echo \
"Batch pool VMSS configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $systemAssignedIdentity"
