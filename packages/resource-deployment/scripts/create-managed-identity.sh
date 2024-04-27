#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-n <name of the identity resource>]
"
    exit 1
}

# Read script arguments
while getopts ":r:n:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    n) managedIdentityName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

# The webApiIdentityClientId and webApiIdentityObjectId are global variables
webApiIdentityClientId=$(az identity create --resource-group "${resourceGroupName}" --name "${webApiManagedIdentityName}" --query "clientId" -o tsv)
webApiIdentityObjectId=$(az identity show --resource-group "${resourceGroupName}" --name "${webApiManagedIdentityName}" --query "principalId" -o tsv)

echo "Created ${webApiManagedIdentityName} managed identity, client ID ${webApiIdentityClientId}"
