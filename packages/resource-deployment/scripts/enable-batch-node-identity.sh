#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

function enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query id -o tsv)
    scope="--scope ${cosmosAccountId}"
    role="DocumentDB Account Contributor"
    . "${0%/*}/create-role-assignment.sh"
}

function enableCosmosRBAC() {
    # Create and assign custom Cosmos DB RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].id" -o tsv)
    if [[ -z "${RBACRoleId}" ]]; then
        echo "Creating a custom Cosmos DB RBAC role ${customRoleName} with read-write permissions"
        RBACRoleId=$(az cosmosdb sql role definition create --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --id "${RBACRoleId}" \
            --exists 1>/dev/null
    fi

    az cosmosdb sql role assignment create --account-name "${cosmosAccountName}" \
        --resource-group "${resourceGroupName}" \
        --scope "/" \
        --principal-id "${principalId}" \
        --role-definition-id "${RBACRoleId}" 1>/dev/null
}

function enableStorageAccess() {
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
    role="Storage Blob Data Contributor"
    . "${0%/*}/create-role-assignment.sh"

    role="Storage Queue Data Contributor"
    . "${0%/*}/create-role-assignment.sh"
}

function enableResourceGroupAccess() {
    role="Contributor"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}"
    . "${0%/*}/create-role-assignment.sh"
}

function enableKeyVaultAccess() {
    . "${0%/*}/key-vault-enable-msi.sh"
}

function enableAccess() {
    local enableAccessProcesses=(
        "enableResourceGroupAccess"
        "enableKeyVaultAccess"
        "enableStorageAccess"
        "enableCosmosAccess"
        "enableCosmosRBAC")
    runCommandsWithoutSecretsInParallel enableAccessProcesses
}

# Read script arguments
while getopts ":r:o:" option; do
    case ${option} in
    o) principalId=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${principalId} ]]; then
    principalId=$(az identity show --name "${batchNodeManagedIdentityName}" --resource-group "${resourceGroupName}" --query principalId -o tsv)
fi

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"

enableAccess
echo "Successfully enabled batch node managed identity ${principalId}"
