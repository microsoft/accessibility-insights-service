#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail
export datalakeStorageAccountName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

templateFile="${0%/*}/../templates/datalake-storage.template.json"
parameters="${0%/*}/../templates/datalake-storage.parameters.json"

echo "[create-datalake-storage-account] Creating Data Lake enabled storage account under resource group '$resourceGroupName' using ARM template $templateFile"
resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "$templateFile" --parameters "$parameters" --query "properties.outputResources[].id" -o tsv)

export resourceName
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
datalakeStorageAccountName="$resourceName"

if [[ -z $datalakeStorageAccountName ]]; then
    echo "[create-datalake-storage-account] Unable to get storage account name from storage account creation response"
    exit 1
fi

echo "Created Data Lake storage account '$datalakeStorageAccountName'"
