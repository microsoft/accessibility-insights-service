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

onExit-key-vault-rotate-certificate() {
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
    batchScanRunnerDist="${0%/*}/../../../web-api-scan-runner/dist/"
    batchScanManagerDist="${0%/*}/../../../web-api-scan-job-manager/dist/"
    batchScanRequestSenderDist="${0%/*}/../../../web-api-scan-request-sender/dist/"
    batchScanNotificationManagerDist="${0%/*}/../../../web-api-send-notification-job-manager/dist/"
    batchScanNotificationRunnerDist="${0%/*}/../../../web-api-send-notification-runner/dist/"
    batchPrivacyScanRunnerDist="${0%/*}/../../../privacy-scan-runner/dist/"
    batchPrivacyScanJobManagerDist="${0%/*}/../../../privacy-scan-job-manager/dist/"
    batchReportGeneratorRunnerDist="${0%/*}/../../../report-generator-runner/dist/"
    batchReportGeneratorJobManagerDist="${0%/*}/../../../report-generator-job-manager/dist/"
}

prepareImageBuildSource() {
    echo "Copy '${environment}' runtime configuration to the docker image build source."
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRunnerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanManagerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanRequestSenderDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationManagerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchScanNotificationRunnerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchPrivacyScanRunnerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchPrivacyScanJobManagerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchReportGeneratorRunnerDist}runtime-config.json"
    cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${batchReportGeneratorJobManagerDist}runtime-config.json"
    echo "Runtime configuration copied successfully."
}

# function runs in a subshell to isolate trap handler
pushImagesToRegistry() (
    trap "onExit-key-vault-rotate-certificate" EXIT

    # shellcheck disable=SC2034
    local imageBuildProcesses=(
        "pushImageToRegistry \"batch-scan-runner:prescanner\" $batchScanRunnerDist windows"
        "pushImageToRegistry \"batch-scan-manager:latest\" $batchScanManagerDist windows"
        "pushImageToRegistry \"batch-scan-request-sender:latest\" $batchScanRequestSenderDist windows"
        "pushImageToRegistry \"batch-scan-notification-manager:latest\" $batchScanNotificationManagerDist windows"
        "pushImageToRegistry \"batch-scan-notification-runner:latest\" $batchScanNotificationRunnerDist windows"
        "pushImageToRegistry \"batch-privacy-scan-runner:prescanner\" $batchPrivacyScanRunnerDist windows"
        "pushImageToRegistry \"batch-privacy-scan-manager:latest\" $batchPrivacyScanJobManagerDist windows"
        "pushImageToRegistry \"batch-report-generator-runner:latest\" $batchReportGeneratorRunnerDist windows"
        "pushImageToRegistry \"batch-report-generator-manager:latest\" $batchReportGeneratorJobManagerDist windows"
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
