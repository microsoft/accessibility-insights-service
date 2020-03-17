#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export dropFolder
export environment

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
    local includePattern="*[!*.map]"

    az storage blob upload-batch --account-name "$storageAccountName" --destination "$destinationContainer" --source "$pathToSource" --pattern "$includePattern" 1>/dev/null
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -r <resource group name> -d <path to drop folder. Will use '$dropFolder' folder relative to current working directory> -e <deploy environment>
"
    exit 1
}

# Read script arguments
while getopts ":r:d:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $dropFolder ]] || [[ -z $environment ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

function uploadFiles() {
    echo "Uploading files to blobs"
    
    local jobManagerContainerName="batch-job-manager-script"
    local webApiScanJobManagerContainerName="batch-web-api-scan-job-manager-script"
    local webApiSendNotificationJobManagerContainerName="batch-web-api-send-notification-job-manager-script"
    local runnerContainerName="batch-runner-script"
    local webApiScanrunnerContainerName="batch-web-api-scan-runner-script"
    local webApiSendNotificationRunnerContainerName="batch-web-api-send-notification-runner-script"
    local scanRequestSenderContainerName="batch-scan-request-sender-script"
    local onDemandScanRequestSenderContainerName="batch-on-demand-scan-request-sender-script"
    local poolStartupContainerName="batch-pool-startup-script"


    uploadProcesses=(
        "uploadFolderContents $jobManagerContainerName \"$dropFolder/job-manager/dist\" \"$storageAccountName\""
        "uploadFolderContents $webApiScanJobManagerContainerName \"$dropFolder/web-api-scan-job-manager/dist\" \"$storageAccountName\""
        "uploadFolderContents $webApiSendNotificationJobManagerContainerName \"$dropFolder/web-api-send-notification-job-manager/dist\" \"$storageAccountName\""
        "uploadFolderContents $runnerContainerName \"$dropFolder/runner/dist\" \"$storageAccountName\""
        "uploadFolderContents $webApiScanrunnerContainerName \"$dropFolder/web-api-scan-runner/dist\" \"$storageAccountName\""
        "uploadFolderContents $webApiSendNotificationRunnerContainerName \"$dropFolder/web-api-send-notification-runner/dist\" \"$storageAccountName\""
        "uploadFolderContents $scanRequestSenderContainerName \"$dropFolder/scan-request-sender/dist\" \"$storageAccountName\""
        "uploadFolderContents $onDemandScanRequestSenderContainerName \"$dropFolder/web-api-scan-request-sender/dist\" \"$storageAccountName\""
        "uploadFolderContents $poolStartupContainerName \"$dropFolder/resource-deployment/dist/scripts/pool-startup\" \"$storageAccountName\""
        "${0%/*}/upload-config-files.sh"
    )
    runCommandsWithoutSecretsInParallel uploadProcesses

    echo "Upload files completed successfully."
}

uploadFiles


