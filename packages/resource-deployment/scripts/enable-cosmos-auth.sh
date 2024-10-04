#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -o <Azure Entra object (principal) ID>"
    exit 1
}

# Read script arguments
while getopts ":r:o:" option; do
    case ${option} in
    o) principalId=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${principalId} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

customRoleName="CosmosDocumentRW"
RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].id" -o tsv)

az cosmosdb sql role assignment create --account-name "${cosmosAccountName}" \
    --resource-group "${resourceGroupName}" \
    --scope "/" \
    --principal-id "${principalId}" \
    --role-definition-id "${RBACRoleId}" 1>/dev/null

echo "The custom role ${customRoleName} has been successfully assigned to the principal ${principalId}"
