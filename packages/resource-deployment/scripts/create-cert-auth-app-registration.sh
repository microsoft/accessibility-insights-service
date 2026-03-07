#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

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

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Checking if app registration ${certAuthAppRegistrationName} exists..."

existingAppId=$(az ad app list \
    --display-name "${certAuthAppRegistrationName}" \
    --query "[?displayName=='${certAuthAppRegistrationName}'].appId | [0]" \
    -o tsv 2>/dev/null) || existingAppId=""

if [[ -n "${existingAppId}" ]]; then
    echo "App registration ${certAuthAppRegistrationName} already exists with appId ${existingAppId}"
else
    echo "Creating app registration ${certAuthAppRegistrationName}..."
    existingAppId=$(az ad app create \
        --display-name "${certAuthAppRegistrationName}" \
        --sign-in-audience AzureADMyOrg \
        --query "appId" -o tsv)

    if [[ -z "${existingAppId}" ]]; then
        echo "Error: Failed to create app registration ${certAuthAppRegistrationName}"
        exit 1
    fi

    echo "Created app registration ${certAuthAppRegistrationName} with appId ${existingAppId}"
fi
