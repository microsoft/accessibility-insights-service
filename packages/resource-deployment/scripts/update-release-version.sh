#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

exitWithUsageInfo() {
    echo "
Usage: $0 \
-r <resource group> \
-v <release version>
"
    exit 1
}

# Read script arguments
while getopts ":r:v:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

getFunctionAppNames() {
    functionAppNamesString=$(az functionapp list --resource-group "$resourceGroupName" --query '[].name' -o tsv | tr "\n" ",")
    echo "Found function apps: $functionAppNamesString"
    IFS=$',' read -ra functionAppNames <<<"$functionAppNamesString"
}

setReleaseVersion() {
    functionAppName=$1
    echo "Updating release version for function app $functionAppName"
    az functionapp config appsettings set --name $functionAppName --resource-group $resourceGroupName --settings "RELEASE_VERSION=$releaseVersion" 1>/dev/null
}

if [ -z $resourceGroupName ] || [ -z $releaseVersion ]; then
    exitWithUsageInfo
fi

getFunctionAppNames

for functionAppName in "${functionAppNames[@]}"; do
    setReleaseVersion $functionAppName
done
