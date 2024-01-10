#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>"
    exit 1
}

# Set default vnet template file
templateFilePath="${0%/*}/../templates/vnet.template.json"

# Read script arguments
while getopts ":a:s:r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

propertyName="properties.disableLocalAuth"
id=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "id" -o tsv)
propertyValue=$(az resource update --ids "$id" --set $propertyName=false --latest-include-preview --query "$propertyName" -o tsv)

echo "The $resourceGroupName/$cosmosAccountName Cosmos DB $propertyName property successfully updated to $propertyValue"
