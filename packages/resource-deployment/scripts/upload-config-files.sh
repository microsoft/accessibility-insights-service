#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export runtimeConfigurationContainerName="runtime-configuration"
export runtimeConfigurationBlobName="runtime-config.json"

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

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

echo "Uploading config files to blobs"

uploadFile $runtimeConfigurationContainerName "$dropFolder/resource-deployment/dist/runtime-config/runtime-config.$environment.json" "$storageAccountName" "$runtimeConfigurationBlobName"
