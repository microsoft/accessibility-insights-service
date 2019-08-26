#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export functionAppName
export resourceName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

# Set default ARM Function App template files
templateFilePath="${0%/*}/../templates/function-app-template.json"

# Read script arguments
while getopts "r:"  option; do
    case $option in
		r) resourceGroupName=${OPTARG} ;;
		*) exitWithUsageInfo ;;
		esac
done

if [ -z "$resourceGroupName" ]; then
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

# Start publishing
echo "Publishing API functions to '$functionAppName' Function App"

# Install the Azure Functions Core Tools
# https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2

# Install the Microsoft package repository GPG key, to validate package integrity
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

# Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update

# Install the Core Tools package
sudo apt-get install azure-functions-core-tools

# change directory to the functions folder to publish
cd "${0%/*}/../../web-api/dist"

#publish the functions to the functionAppName
func azure functionapp publish $functionAppName --node

echo "Successfully published API functions to '$functionAppName' Function App"