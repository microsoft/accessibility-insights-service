#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail
export storageAccountName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
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

templateFile="${0%/*}/../templates/storage.template.json"

echo "Creating storage account under resource group $resourceGroupName using ARM template $templateFile"
resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "$templateFile" --query "properties.outputResources[].id" -o tsv)

export resourceName
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
storageAccountName="$resourceName"

if [[ -z $storageAccountName ]]; then
    echo "Unable to get storage account name from storage account creation response"
    exit 1
fi

echo "Created storage account $storageAccountName"
