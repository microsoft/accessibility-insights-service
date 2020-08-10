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
    echo "Uploading files to Blob storage"

    uploadProcesses=(
        "uploadFolderContents \"batch-pool-startup-script\" \"$dropFolder/resource-deployment/dist/scripts/pool-startup\" \"$storageAccountName\""
        "uploadFile \"runtime-configuration\" \"$dropFolder/resource-deployment/dist/runtime-config/runtime-config.$environment.json\" \"$storageAccountName\" \"runtime-config.json\""
    )

    runCommandsWithoutSecretsInParallel uploadProcesses

    echo "Upload files completed successfully."
}

uploadFiles
