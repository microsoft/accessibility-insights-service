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

function onExit() {
    local exitCode=$?

    if [[ $exitCode != 0 ]]; then
        echo "Failed to push images to Azure Container Registry"
    else
        echo "Images successfully pushed to Azure Container Registry"
    fi

    exit $exitCode
}

pushImageToRegistry() {
    local name=$1
    local source=$2
    local platform=$3

    az acr build --platform $platform --image $containerRegistryName.azurecr.io/$name:latest --registry $containerRegistryName $source | sed -e "s/^/[$name] /"
}

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

# Set image source location
batchScanRunnerDist="${0%/*}/../../../web-api-scan-runner/dist/"
batchScanManagerDist="${0%/*}/../../../web-api-scan-job-manager/dist/"
batchScanRequestSenderDist="${0%/*}/../../../web-api-scan-request-sender/dist/"
batchScanNotificationManagerDist="${0%/*}/../../../web-api-send-notification-job-manager/dist/"
batchScanNotificationRunnerDist="${0%/*}/../../../web-api-send-notification-runner/dist/"

if [[ $environment == "dev" ]]; then
    privateImagePath="${0%/*}/../../../../../accessibility-insights-service-private/docker-image/"
    if [ -d "$privateImagePath" ]; then
        echo "Found private service repository location. Build docker image content."
        cp -a "$privateImagePath." "$batchScanRunnerDist"
    fi
fi

echo "Copy $environment runtime configuration to the dist folder"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRunnerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanManagerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRequestSenderDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationManagerDist}runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationRunnerDist}runtime-config.json"
echo "Runtime configuration was copied successfully"

imageBuildProcesses=(
    "pushImageToRegistry \"batch-scan-runner\" $batchScanRunnerDist windows"
    "pushImageToRegistry \"batch-scan-manager\" $batchScanManagerDist windows"
    "pushImageToRegistry \"batch-scan-request-sender\" $batchScanRequestSenderDist linux"
    "pushImageToRegistry \"batch-scan-notification-manager\" $batchScanNotificationManagerDist linux"
    "pushImageToRegistry \"batch-scan-notification-runner\" $batchScanNotificationRunnerDist linux"
)

# Login to container registry
az acr login --name "$containerRegistryName"

trap "onExit" EXIT

echo "Pushing images to Azure Container Registry..."
runCommandsWithoutSecretsInParallel imageBuildProcesses
