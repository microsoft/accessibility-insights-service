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

if [[ -z "${existingAppId}" ]]; then
    echo "Error: App registration ${certAuthAppRegistrationName} not found."
    echo "Create it manually in Azure Entra ID with display name '${certAuthAppRegistrationName}' and single-tenant access, then re-run this script."
    exit 1
fi

echo "Found app registration ${certAuthAppRegistrationName} with appId ${existingAppId}"
