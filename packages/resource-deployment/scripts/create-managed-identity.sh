#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
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

function createIdentity() {
    local managedIdentityName=$1

    identity=$(az identity create --resource-group "${resourceGroupName}" --name "${managedIdentityName}")
    echo "Created ${managedIdentityName} user-managed identity."
    echo "${identity}"
}

. "${0%/*}/get-resource-names.sh"

createIdentity "${webApiManagedIdentityName}"
createIdentity "${batchNodeManagedIdentityName}"
