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

function setupPools() {
    # Enable managed identity on Batch pools
    pools=$(az batch pool list --query "[].id" -o tsv)

    echo "Setup tags for VMSS"
    parallelProcesses=()
    for pool in ${pools}; do
        pool="${pool//[$'\t\r\n ']/}"

        command=". \"${0%/*}/add-tags-for-batch-vmss.sh\""
        commandName="Setup tags for pool ${pool}"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
        parallelProcesses+=("$!")
    done
    waitForProcesses parallelProcesses

    echo "Enable VMSS automatic OS image upgrades"
    parallelProcesses=()
    for pool in ${pools}; do
        pool="${pool//[$'\t\r\n ']/}"

        command=". \"${0%/*}/enable-os-image-upgrade.sh\""
        commandName="Enable VMSS automatic OS image upgrades for pool ${pool}"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
        parallelProcesses+=("$!")
    done
    waitForProcesses parallelProcesses
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

function enableAccess() {
    local enableAccessProcesses=(
        "enableResourceGroupAccess"
        "enableStorageAccess"
        "enableCosmosAccess"
        "enableCosmosRBAC")
    runCommandsWithoutSecretsInParallel enableAccessProcesses
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"

echo "Logging into ${batchAccountName} Azure Batch account"
az batch account login --name "${batchAccountName}" --resource-group "${resourceGroupName}"

principalId=$(az identity show --name "${batchNodeManagedIdentityName}" --resource-group "${resourceGroupName}" --query principalId -o tsv)

enableAccess
setupPools

echo "Successfully setup all pools for batch account ${batchAccountName}"
