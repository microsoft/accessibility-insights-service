#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

az acr login --name "$containerRegistryName"

src="${0%/*}/../../../web-api-scan-runner/dist/docker-image-config/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-runner:latest --registry $containerRegistryName $src

src="${0%/*}/../../../web-api-scan-job-manager/dist/docker-image-config/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-manager:latest --registry $containerRegistryName $src
