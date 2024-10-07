#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-o <Azure Entra object (principal) ID>]
"
    exit 1
}

function enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query id -o tsv)
    scope="--scope ${cosmosAccountId}"
    role="DocumentDB Account Contributor"
    . "${0%/*}/create-role-assignment.sh"
}

function enableBatchAccount() {
    roleDefinitionFileName="${0%/*}/../templates/batch-account-custom-role.json"
    roleDefinitionGeneratedFileName="batch-account-custom-role.generated.json"

    # The role is assigned under a tenant in the subscription scope. Creating it under another subscription
    # may fail due to lack of access to the original scope, so a unique role is created per subscription scope.
    roleNameSuffix=${subscription:24:12}
    roleName="BatchAccountJobSubmitter_${roleNameSuffix}"

    sed -e "s@%NAME_TOKEN%@${roleName}@" -e "s@%SUBSCRIPTION_TOKEN%@${subscription}@" "${roleDefinitionFileName}" >"${roleDefinitionGeneratedFileName}"

    roleId=$(az role definition list --custom-role-only true --query "[?roleName=='${roleName}'].id" -o tsv)
    if [[ -z "${roleId}" ]]; then
        echo "Creating a custom Batch Account access role ${roleName}..."
        roleId=$(az role definition create --role-definition "${roleDefinitionGeneratedFileName}" --query "id" -o tsv)
        # Wait for the new role to propagate in Azure.
        sleep 60
    fi

    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Batch/batchAccounts/${batchAccountName}"
    role=${roleName}
    . "${0%/*}/create-role-assignment.sh"
}

function enableCosmosRole() {
    customRoleName="CosmosDocumentRW"
    roleId=$(az cosmosdb sql role definition list --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].id" -o tsv)
    if [[ -z "${roleId}" ]]; then
        echo "Creating a custom Cosmos DB access role ${customRoleName}"
        roleId=$(az cosmosdb sql role definition create --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --id "${roleId}" \
            --exists 1>/dev/null
    fi

    az cosmosdb sql role assignment create --account-name "${cosmosAccountName}" \
        --resource-group "${resourceGroupName}" \
        --scope "/" \
        --principal-id "${principalId}" \
        --role-definition-id "${roleId}" 1>/dev/null
}

function enableStorageAccess() {
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
    role="Storage Blob Data Contributor"
    . "${0%/*}/create-role-assignment.sh"

    role="Storage Queue Data Contributor"
    . "${0%/*}/create-role-assignment.sh"
}

function enableKeyVaultAccess() {
    . "${0%/*}/key-vault-enable-msi.sh"
}

function enableContainerRegistryAccess() {
    role="acrpull"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerRegistry/registries/${containerRegistryName}"
    . "${0%/*}/create-role-assignment.sh"
}

function enableAccess() {
    local enableAccessProcesses=(
        "enableContainerRegistryAccess"
        "enableKeyVaultAccess"
        "enableStorageAccess"
        "enableCosmosAccess"
        "enableBatchAccount"
        "enableCosmosRole")
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
echo "Successfully enabled Batch node managed identity ${principalId}"
