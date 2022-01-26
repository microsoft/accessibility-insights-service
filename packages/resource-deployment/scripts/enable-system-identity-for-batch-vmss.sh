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

enableResourceGroupAccess() {
    role="Contributor"
    scope="--resource-group $resourceGroupName"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableStorageAccess() {
    scope="--scope /subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName"

    role="Storage Blob Data Contributor"
    . "${0%/*}/role-assign-for-sp.sh"

    role="Storage Queue Data Contributor"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query id -o tsv)
    scope="--scope $cosmosAccountId"

    role="DocumentDB Account Contributor"
    . "${0%/*}/role-assign-for-sp.sh"

    # Create and assign custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "[?roleName=='$customRoleName'].id" -o tsv)
    if [[ -z "$RBACRoleId" ]]; then
        echo "Creating a custom RBAC role with read-write permissions"
        RBACRoleId=$(az cosmosdb sql role definition create --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --id "${RBACRoleId}" \
            --exists 1>/dev/null
    fi

    local end=$((SECONDS + 300))
    echo "Creating a custom role assignment $customRoleName under $cosmosAccountName Cosmos DB account"
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        response=$(az cosmosdb sql role assignment create --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" --scope "/" --principal-id "$principalId" --role-definition-id "$RBACRoleId") || true
        if [[ -n $response ]]; then
            break
        else
            printf "."
        fi

        sleep 5
    done
    echo "  ended"

    if [[ -z $response ]]; then
        echo "Unable to create a custom role assignment $customRoleName under $cosmosAccountName Cosmos DB account"
        exit 1
    fi

    echo "Successfully created a custom role assignment $customRoleName under $cosmosAccountName Cosmos DB account"
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

    enableResourceGroupAccess
    enableStorageAccess
    enableCosmosAccess
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
