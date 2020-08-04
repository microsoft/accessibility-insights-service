#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-e <runtime environment>]
"
    exit 1
}

# Read script arguments
while getopts ":r:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

. "${0%/*}/get-resource-names.sh"

echo "Copy the $environment runtime configuration to the image"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../../web-api-scan-runner/dist/runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../..//web-api-scan-job-manager/dist/runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../../web-api-scan-request-sender/dist/runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../../web-api-send-notification-job-manager/dist/runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../../web-api-send-notification-runner/dist/runtime-config.json"
echo "Runtime configuration was copied successfully"

az acr login --name "$containerRegistryName"

src="${0%/*}/../../../web-api-scan-runner/dist/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-runner:latest --registry $containerRegistryName $src

src="${0%/*}/../../../web-api-scan-job-manager/dist/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-manager:latest --registry $containerRegistryName $src

src="${0%/*}/../../../web-api-scan-request-sender/dist/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-request-sender:latest --registry $containerRegistryName $src

src="${0%/*}/../../../web-api-send-notification-job-manager/dist/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-notification-manager:latest --registry $containerRegistryName $src

src="${0%/*}/../../../web-api-send-notification-runner/dist/"
az acr build --image $containerRegistryName.azurecr.io/batch-scan-notification-runner:latest --registry $containerRegistryName $src
