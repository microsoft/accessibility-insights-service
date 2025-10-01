#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-e <runtime environment>]
"
    exit 1
}

# Read script arguments
while getopts ":r:e:w:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    w) keepImages=${OPTARG} ;;
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

onExit-push-image-to-container-registry() {
    local exitCode=$?

    if [[ $exitCode != 0 ]]; then
        echo "Failed to push images to Azure Container Registry."
    else
        echo "Images successfully pushed to Azure Container Registry."
    fi

    exit $exitCode
}

pushImageToRegistry() {
    local name=$1
    local source=$2
    local platform=$3

    az acr build --platform $platform --image $containerRegistryName.azurecr.io/$name --registry $containerRegistryName $source | sed -e "s/^/[$name] /"
}

setImageBuildSource() {
    batchScanRequestSenderDist="${0%/*}/../../../web-api-scan-request-sender/dist/"
    batchPrivacyScanRunnerDist="${0%/*}/../../../privacy-scan-runner/dist/"
    batchPrivacyScanJobManagerDist="${0%/*}/../../../privacy-scan-job-manager/dist/"
}

prepareImageBuildSource() {
    echo "Copy $environment runtime configuration to the docker image build source."
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRequestSenderDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchPrivacyScanRunnerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchPrivacyScanJobManagerDist}runtime-config.json"
    echo "Runtime configuration copied successfully."
}

# function runs in a subshell to isolate trap handler
pushImagesToRegistry() (
    trap "onExit-push-image-to-container-registry" EXIT

    # shellcheck disable=SC2034
    local imageBuildProcesses=(
        "pushImageToRegistry \"batch-scan-request-sender:latest\" $batchScanRequestSenderDist windows"
        "pushImageToRegistry \"batch-privacy-scan-runner:prescanner\" $batchPrivacyScanRunnerDist windows"
        "pushImageToRegistry \"batch-privacy-scan-manager:latest\" $batchPrivacyScanJobManagerDist windows"
    )

    echo "Pushing images to Azure Container Registry."
    runCommandsWithoutSecretsInParallel imageBuildProcesses
)

if [[ $keepImages != true ]]; then
    . "${0%/*}/get-resource-names.sh"
    . "${0%/*}/process-utilities.sh"

    # Login to container registry
    az acr login --name "$containerRegistryName"

    setImageBuildSource
    prepareImageBuildSource
    pushImagesToRegistry
else
    echo "Skip pushing images to Azure Container Registry."
fi
