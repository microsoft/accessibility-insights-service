#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export jobManagerContainerName="batch-job-manager-script"
export runnerContainerName="batch-runner-script"
export scanRequestSenderContainerName="batch-scan-request-sender-script"
export onDemandScanRequestSenderContainerName="batch-on-demand-scan-request-sender-script"
export poolStartupContainerName="batch-pool-startup-script"
export includePattern="*[!*.map]"

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

uploadFolderContents() {
    destinationContainer=$1
    pathToSource=$2
    storageAccountName=$3
    includePattern=$4

    az storage blob upload-batch --account-name "$storageAccountName" --destination "$destinationContainer" --source "$pathToSource" --pattern "$includePattern" 1>/dev/null
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -s <storage account name> -d <path to drop folder. Will use '$dropFolder' folder relative to current working directory> -e <deploy environment>
"
    exit 1
}

# Read script arguments
while getopts "s:d:e:" option; do
    case $option in
    s) storageAccountName=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $storageAccountName ]] || [[ -z $dropFolder ]] || [[ -z $environment ]]; then
    exitWithUsageInfo
fi

echo "Uploading files to blobs"

uploadFolderContents $jobManagerContainerName "$dropFolder/job-manager/dist" "$storageAccountName" "$includePattern"
uploadFolderContents $runnerContainerName "$dropFolder/runner/dist" "$storageAccountName" "$includePattern"
uploadFolderContents $scanRequestSenderContainerName "$dropFolder/scan-request-sender/dist" "$storageAccountName" "$includePattern"
uploadFolderContents $onDemandScanRequestSenderContainerName "$dropFolder/web-api-scan-request-sender/dist" "$storageAccountName" "$includePattern"
uploadFolderContents $poolStartupContainerName "$dropFolder/resource-deployment/dist/scripts/pool-startup" "$storageAccountName" "$includePattern"
. "${0%/*}/upload-config-files.sh"
