#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create a service principal and configure its access to Azure resources under resource group and key vault
# The script can be run multiple times that result the same service principal entity but with password reset

export subscription
export resourceGroupName
export keyVault

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-c <system assigned managed identity object (principal) id>] [-s <subscription name or id>] [-k <key vault>]
"
    exit 1
}

grantAccess() {
    local assignee=$1

    # Granting access to resource group
    echo "Granting access to the $resourceGroupName resource group"
    az role assignment create \
        --role "Contributor" \
        --assignee "$assignee" \
        --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName" 1>/dev/null

    # Set key vault access policy
    echo "Granting access to the $keyVault Key Vault"
    az role assignment create \
        --role "Key Vault Secrets User" \
        --assignee "$assignee" \
        --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName/providers/Microsoft.KeyVault/vaults/$keyVault" 1>/dev/null

    # Granting access to storage blob
    echo "Granting access to the $storageAccountName Blob storage"
    az role assignment create \
        --role "Storage Blob Data Contributor" \
        --assignee "$assignee" \
        --scope "/subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName" 1>/dev/null

    # Granting access to storage queue
    echo "Granting access to the $storageAccountName Queue storage"
    az role assignment create \
        --role "Storage Queue Data Contributor" \
        --assignee "$assignee" \
        --scope "/subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName" 1>/dev/null
}

# Read script arguments
while getopts ":s:r:k:c:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

if [[ -z $clientId ]]; then
    user=$(az ad signed-in-user show --query "userPrincipalName" -o tsv)
    clientId=$(az ad signed-in-user show --query "id" -o tsv)
    echo "Granting permissions to signed in $user user..."
fi

grantAccess $clientId
