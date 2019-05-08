#!/bin/bash

# Set default Azure subscription
echo "Switching to '$subscription' Azure subscription"
az account set --subscription $subscription

# Login into Azure Batch Account
echo "Logging into '$account' Azure Batch Account"
az batch account login --name $account --resource-group $resourceGroup

# Validate Azure Batch Account for the user subscription pool allocation mode
echo "Validating Azure Batch Account configuration"
poolAllocationMode=$(az batch account show --name $account --resource-group $resourceGroup --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "ERROR: Azure Batch Account with '$poolAllocationMode' pool allocation mode is not supported."
    exit 1
fi

# Get Batch pool Azure VMSS resource group and name
echo "Retrieving Batch pool VMSS configuration"
query="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$account']"
vmssResourceGroup=$(az vmss list --query "$query.resourceGroup" -o tsv)
vmssName=$(az vmss list --query "$query.name" -o tsv)

if [[ -z $vmssResourceGroup ]] || [[ -z $vmssName ]]; then
    echo "Azure Batch account '$account' has no VMSS created for the '$pool' pool"
    exit 1
fi

# Enable system-assigned managed identity on a VMSS
vmssId="/subscriptions/$subscription/resourceGroups/$vmssResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/$vmssName"
echo "Enabling system-assigned managed identity on VMSS $vmssId"
systemAssignedIdentity=$(az vmss identity assign --name $vmssName --resource-group $vmssResourceGroup --query systemAssignedIdentity -o tsv)
