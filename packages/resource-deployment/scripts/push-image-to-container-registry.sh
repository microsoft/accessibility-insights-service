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

pushImageToRegistry() {
    local name=$1
    local source=$2

    az acr build --image $containerRegistryName.azurecr.io/$name:latest --registry $containerRegistryName $source 1>/dev/null
}

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

# Set image source location
batchScanRunnerDist="${0%/*}/../../../web-api-scan-runner/dist/"
batchScanManagerDist="${0%/*}/../../../web-api-scan-job-manager/dist/"
batchScanRequestSenderDist="${0%/*}/../../../web-api-scan-request-sender/dist/"
batchScanNotificationManagerDist="${0%/*}/../../../web-api-send-notification-job-manager/dist/"
batchScanNotificationRunnerDist="${0%/*}/../../../web-api-send-notification-runner/dist/"

echo "Copy $environment runtime configuration to the dist folder"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRunnerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanManagerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRequestSenderDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationManagerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationRunnerDist}runtime-config.json"
echo "Runtime configuration was copied successfully"

imageBuildProcesses=(
    "pushImageToRegistry \"batch-scan-runner\" $batchScanRunnerDist"
    "pushImageToRegistry \"batch-scan-manager\" $batchScanManagerDist"
    "pushImageToRegistry \"batch-scan-request-sender\" $batchScanRequestSenderDist"
    "pushImageToRegistry \"batch-scan-notification-manager\" $batchScanNotificationManagerDist"
    "pushImageToRegistry \"batch-scan-notification-runner\" $batchScanNotificationRunnerDist"
)

# Login to container registry
az acr login --name "$containerRegistryName"

echo "Pushing images to the container registry..."
runCommandsWithoutSecretsInParallel imageBuildProcesses
echo "Images pushed to the container registry"
