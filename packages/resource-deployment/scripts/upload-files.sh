#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export jobManagerContainerName="batch-job-manager-script"
export runnerContainerName="batch-runner-script"
export scanRequestSenderContainerName="batch-scan-request-sender-script"
export poolStartupContainerName="batch-pool-startup-script"
export runtimeConfigurationContainerName="runtime-configuration"
export runtimeConfigurationBlobName="runtime-config.json"
export includePattern="*[!*.map]"

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

if [[ -z $profileName ]]; then
    profileName="dev"
fi

uploadFileBatch() {
    destinationContainer=$1
    pathToSource=$2
    storageAccountName=$3
    includePattern=$4

    az storage blob upload-batch --account-name "$storageAccountName" --destination "$destinationContainer" --source "$pathToSource" --pattern "$includePattern" 1>/dev/null
}

uploadFile() {
    destinationContainer=$1
    pathToSource=$2
    storageAccountName=$3
    blobName=$4

    az storage blob upload --account-name "$storageAccountName" --container-name "$destinationContainer" --file "$pathToSource" --name "$blobName" 1>/dev/null
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -s <storage account name> -d <path to drop folder. Will use '$dropFolder' folder relative to current working directory>
"
    exit 1
}

# Read script arguments
while getopts "s:d:p:" option; do
    case $option in
    s) storageAccountName=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    p) profileName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $storageAccountName ]] || [[ -z $dropFolder ]] || [[ -z $profileName ]]; then
    exitWithUsageInfo
fi

echo "Uploading files to blobs"

uploadFileBatch $jobManagerContainerName "$dropFolder/job-manager/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $runnerContainerName "$dropFolder/runner/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $scanRequestSenderContainerName "$dropFolder/scan-request-sender/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $poolStartupContainerName "$dropFolder/resource-deployment/dist/scripts/pool-startup" "$storageAccountName" "$includePattern"
uploadFile $runtimeConfigurationContainerName "$dropFolder/resource-deployment/runtime-config/runtime-config.$profileName.json" "$storageAccountName" "$runtimeConfigurationBlobName"
