#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script starts health monitor orchestrator

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

masterKey=$(az functionapp keys list --name "${webWorkersFuncAppName}" --resource-group "${resourceGroupName}" --query "masterKey" -o tsv)

curl --header "Content-Type: application/json" \
    --header "x-functions-key: ${masterKey}" \
    --request POST \
    --data '{}' \
    --write-out 'HTTP %{response_code}\n' \
    https://"${webWorkersFuncAppName}".azurewebsites.net/admin/functions/health-monitor-orchestration
