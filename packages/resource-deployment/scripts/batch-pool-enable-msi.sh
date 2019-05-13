#!/bin/bash

# The script will enable system-assigned managed identity on Batch pool VMSS

if [[ -z $resourceGroup ]] || [[ -z $account ]] || [[ -z $pool ]]; then
    echo \
"
The $0 script expects following variables to be defined:

    resourceGroup - Azure resource group name
    account - Azure Batch account name
    pool - Azure Batch pool name
"
    exit 1
fi

# Validate Azure Batch Account for the user subscription pool allocation mode
echo "Validating Azure Batch Account '$account' configuration"
poolAllocationMode=$(az batch account show --name $account --resource-group $resourceGroup --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "ERROR: Azure Batch Account with '$poolAllocationMode' pool allocation mode is not supported."
    exit 1
fi

# Get Batch pool Azure VMSS resource group and name
echo "Retrieving Batch pool '$pool' VMSS configuration"
query="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$account']"
vmssResourceGroup=$(az vmss list --query "$query.resourceGroup" -o tsv)
vmssName=$(az vmss list --query "$query.name" -o tsv)

if [[ -z $vmssResourceGroup ]] || [[ -z $vmssName ]]; then
    echo "Azure Batch account '$account' has no VMSS created for the '$pool' pool"
    exit 1
fi

# Enable system-assigned managed identity on a VMSS
echo "Enabling system-assigned managed identity on VMSS $vmssName"
systemAssignedIdentity=$(az vmss identity assign --name $vmssName --resource-group $vmssResourceGroup --query systemAssignedIdentity -o tsv)

echo \
"Batch pool VMSS configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $systemAssignedIdentity"
