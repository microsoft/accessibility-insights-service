#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export functionAppName
export resourceName
export keyVault

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -k <the keyVault azure function app needs access to >
"
    exit 1
}

# Set default ARM Function App template files
templateFilePath="${0%/*}/../templates/function-app-template.json"

# Read script arguments
while getopts "r:k:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $keyVault ]]; then
    exitWithUsageInfo
fi

# Start deployment
echo "Deploying Function App using ARM template"
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --query "properties.outputResources[].id" \
    -o tsv)

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
functionAppName=$resourceName
echo "Successfully deployed Function App '$functionAppName'"

# Add system-assigned managed identity to function app

echo "Adding managed identity to Function App '$functionAppName'"
principalId=$(az webapp identity assign --name "$functionAppName" --resource-group "$resourceGroupName" --query principalId -o tsv)
echo "Successfully Added managed identity to Function App '$functionAppName'"

. "${0%/*}/key-vault-enable-msi.sh"
