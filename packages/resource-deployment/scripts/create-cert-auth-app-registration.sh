#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -a <app registration client id>
"
    exit 1
}

# Read script arguments
while getopts ":r:a:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    a) appRegistrationClientId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${appRegistrationClientId} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Verifying app registration ${appRegistrationClientId} exists..."

if ! az ad app show --id "${appRegistrationClientId}" --query "appId" -o tsv 1>/dev/null 2>&1; then
    echo "Error: App registration with client id '${appRegistrationClientId}' not found."
    echo "Create it manually in Azure Entra ID with display name '${certAuthAppRegistrationName}' and single-tenant access, then re-run this script."
    exit 1
fi

echo "Found app registration with appId ${appRegistrationClientId}"
