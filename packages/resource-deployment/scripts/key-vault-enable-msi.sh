#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# This script will grant permissions to the service principal to access a key vault

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -k <key vault> -p <service principal id> [-s <subscription name or id>]
"
    exit 1
}

# Read script arguments
while getopts ":s:r:k:p:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $keyVault ]] || [[ -z $principalId ]]; then
    exitWithUsageInfo
fi

if [[ -z $subscription ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

# Grant permissions to the managed identity
echo "Granting '$principalId' service principal permissions to '$keyVault' key vault"
az role assignment create \
    --role "Key Vault Reader" \
    --assignee "$principalId" \
    --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName/providers/Microsoft.KeyVault/vaults/$keyVault" 1>/dev/null

echo "  Permission successfully granted."
