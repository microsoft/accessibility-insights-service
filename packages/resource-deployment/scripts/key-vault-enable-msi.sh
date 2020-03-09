#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# This script will grant permissions to the service principal to access a key vault

exitWithUsageInfo() {
    echo "
Usage: $0 -k <key vault> -p <service principal id>
"
    exit 1
}

# Read script arguments
while getopts ":k:p:" option; do
    case $option in
    k) keyVault=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $keyVault ]] || [[ -z $principalId ]]; then
    exitWithUsageInfo
fi

# Grant permissions to the managed identity
echo "Granting '$principalId' service principal permissions to '$keyVault' key vault"
az keyvault set-policy --name "$keyVault" --object-id "$principalId" --secret-permissions get list 1>/dev/null
echo "  Permission successfully granted."
