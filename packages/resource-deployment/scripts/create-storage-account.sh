#!/bin/bash
# shellcheck disable=SC1090
set -eo pipefail
export storageAccountName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

while getopts "r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

echo "Creating storage account under resource group $resourceGroupName using ARM template"
resources=$(az group deployment create --resource-group "$resourceGroupName" --template-file "${0%/*}/../templates/blob-storage.template.json" --parameters "${0%/*}/../templates/blob-storage.parameters.json" --query "properties.outputResources[].id" -o tsv)

export resourceName
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
storageAccountName="$resourceName"

if [[ -z $storageAccountName ]]; then
    echo "Unable to get storage account name from storage account creation response"
    exit 1
fi

echo "Created storage account $storageAccountName"
