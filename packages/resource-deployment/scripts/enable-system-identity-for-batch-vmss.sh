#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export principalId
export role
export scope

# The script will enable system-assigned managed identity on Batch pool VMSS

exitWithUsageInfo() {
    echo "
Usage: $0 -v <vmss name> -r <vmss resource group> -p <batch pool>
"
    exit 1
}

assignSystemIdentity() {
    principalId=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)

    echo \
        "VMSS Resource configuration:
  Batch Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $principalId
  "
    . "${0%/*}/key-vault-enable-msi.sh"

    role="Contributor"
    scope="--resource-group $resourceGroupName"
    . "${0%/*}/role-assign-for-sp.sh"

    role="Storage Blob Data Contributor"
    scope="--scope /subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName"
    . "${0%/*}/role-assign-for-sp.sh"
}

# Read script arguments
while getopts ":v:r:p:" option; do
    case $option in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $vmssName ]] || [[ -z $vmssResourceGroup ]] || [[ -z $pool ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

assignSystemIdentity
