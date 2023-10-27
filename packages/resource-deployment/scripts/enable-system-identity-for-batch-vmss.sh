#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

export principalId
export role
export scope

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -v <vmss name> -r <vmss resource group> -p <batch pool>
"
    exit 1
}

enableResourceGroupAccess() {
    role="Contributor"
    scope="--resource-group $resourceGroupName"
    . "${0%/*}/create-role-assignment.sh"
}

enableStorageAccess() {
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"

    role="Storage Blob Data Contributor"
    . "${0%/*}/create-role-assignment.sh"

    role="Storage Queue Data Contributor"
    . "${0%/*}/create-role-assignment.sh"
}

enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query id -o tsv)
    scope="--scope ${cosmosAccountId}"

    role="DocumentDB Account Contributor"
    . "${0%/*}/create-role-assignment.sh"

    # Create and assign custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].id" -o tsv)
    if [[ -z "${RBACRoleId}" ]]; then
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
    echo "Creating a custom role assignment ${customRoleName} under ${cosmosAccountName} Cosmos DB account"
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        local status="ok"
        az cosmosdb sql role assignment create --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --scope "/" --principal-id "${principalId}" --role-definition-id "${RBACRoleId}" 1>/dev/null || status="failed"
        if [[ ${status} == "ok" ]]; then
            break
        else
            printf "."
        fi

        sleep 5
    done
    echo "  ended"

    if [[ ${status} == "failed" ]]; then
        echo "Unable to create a custom role assignment ${customRoleName} under ${cosmosAccountName} Cosmos DB account"
        exit 1
    fi

    echo "Successfully created a custom role assignment ${customRoleName} under ${cosmosAccountName} Cosmos DB account"
}

assignSystemIdentity() {
    local end=$((SECONDS + 300))
    echo "Assigning system managed identity to Batch pool VMSS ${vmssName}"
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        local status="ok"
        az vmss identity assign --name "${vmssName}" --resource-group "${vmssResourceGroup}" 1>/dev/null || status="failed"
        principalId=$(az vmss identity show --name "${vmssName}" --resource-group "${vmssResourceGroup}" --query principalId -o tsv) || status="failed"

        if [[ ${status} == "ok" ]] && [[ -n ${principalId} ]]; then
            break
        else
            printf "."
        fi

        sleep 15
    done
    echo "  ended"

    if [[ ${status} == "failed" ]]; then
        echo "Failed to assign system managed identity to Batch pool VMSS ${vmssName}"
        exit 1
    fi

    echo \
        "VMSS Resource configuration:
  Batch Pool: ${pool}
  VMSS resource group: ${vmssResourceGroup}
  VMSS name: ${vmssName}
  System-assigned identity: ${principalId}"
    echo "Successfully assigned system managed identity to Batch pool VMSS ${vmssName}"
}

# Read script arguments
while getopts ":v:r:p:" option; do
    case ${option} in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${vmssName} ]] || [[ -z ${vmssResourceGroup} ]] || [[ -z ${pool} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

assignSystemIdentity
. "${0%/*}/key-vault-enable-msi.sh"
enableResourceGroupAccess
enableStorageAccess
enableCosmosAccess
