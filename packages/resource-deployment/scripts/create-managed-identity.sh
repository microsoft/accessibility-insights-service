#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -l <Azure region>
"
    exit 1
}

# Read script arguments
while getopts ":r:l:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${location} ]]; then
    exitWithUsageInfo
fi

function createIdentity() {
    local managedIdentityName=$1

    identity=$(az identity create --resource-group "${resourceGroupName}" --name "${managedIdentityName}")
    az rest \
        --method put \
        --uri "https://management.azure.com/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${managedIdentityName}?api-version=2025-01-31-preview" \
        --body "{\"location\":\"${location}\",\"properties\":{\"isolationScope\":\"Regional\"}}" 1>/dev/null

    echo "Created ${managedIdentityName} user-managed identity."
    echo "${identity}"
}

. "${0%/*}/get-resource-names.sh"

createIdentity "${webApiManagedIdentityName}"
createIdentity "${batchNodeManagedIdentityName}"
