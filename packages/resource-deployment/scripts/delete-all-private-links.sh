#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>"
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

"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g blob
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g queue
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g table
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g file
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g vault
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g sql
"${0%/*}"/delete-private-link.sh -r "${resourceGroupName}" -g website

echo "[delete-all-private-link] Completed deletion of all private links"
