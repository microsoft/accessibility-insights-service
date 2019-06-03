#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export jobManagerContainerName="batch-job-manager-script"
export runnerContainerName="batch-runner-script"
export scanRequestSenderContainerName="batch-scan-request-sender-script"
export poolStartupContainerName="batch-pool-startup-script"
export includePattern="*[!*.map]"

uploadFileBatch() {
    destinationContainer=$1
    pathToSource=$2
    storageAccountName=$3
    includePattern=$4

    az storage blob upload-batch --account-name "$storageAccountName" --destination "$destinationContainer" --source "$pathToSource" --pattern "$includePattern"
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -s <storage account name> -d <path to drop folder (optional)>
"
    exit 1
}

# Read script arguments
while getopts "s:d:" option; do
    case $option in
    s) storageAccountName=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $storageAccountName ]] || [[ -z $dropFolder ]]; then
    exitWithUsageInfo
fi

echo "Uploading files to blobs"

uploadFileBatch $jobManagerContainerName "$dropFolder/job-manager/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $runnerContainerName "$dropFolder/runner/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $scanRequestSenderContainerName "$dropFolder/scan-request-sender/dist" "$storageAccountName" "$includePattern"
uploadFileBatch $poolStartupContainerName "$dropFolder/resource-deployment/scripts" "$storageAccountName" "$includePattern"
