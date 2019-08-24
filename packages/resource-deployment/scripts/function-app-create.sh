#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -euo pipefail

export subscription=""
export resourceGroupName=""
export location=""
export functionAppName
export appInsightsName
export storageAccountName

exitWithUsageInfo() {
    echo "
Usage: $0 -s <subscription name or id> -r <resource group> -l <location>
"
    exit 1
}

# Set default ARM Function App template files
templateFilePath="../templates/function-app-template.json"

# Read script arguments
while getopts "s:r:l:"  option; do
    case $option in
		s) subscription=${OPTARG} ;;
		r) resourceGroupName=${OPTARG} ;;
		l) location=${OPTARG} ;;
		*) exitWithUsageInfo ;;
		esac
done

if [ -z "$subscription" ] || [ -z "$resourceGroupName" ] || [ -z "$location" ]; then
	echo "Either one of subscription, resourceGroupName or location is empty"
	exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

# Set the default subscription id
az account set --subscription $subscription

# Check for existing RG
if [ $(az group exists --name $resourceGroupName) = false ]; then
	echo "Resource group with name" $resourceGroupName "could not be found. Creating new resource group.."
	az group create --name $resourceGroupName --location $location 1> /dev/null
	echo "Resource group has been successfully created"
else
	echo "Using existing resource group..."
fi

# Start deployment
echo "Deploying Function App using ARM template"
export resourceName
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --query "properties.outputResources[].id" \
    -o tsv)


. "get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
functionAppName=$resourceName
echo "Successfully deployed Function App '$functionAppName'"

. "get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
storageAccountName=$resourceName
echo "Successfully created Storage Account '$storageAccountName'"

. "get-resource-name-from-resource-paths.sh" -p "microsoft.insights/components" -r "$resources"
appInsightsName=$resourceName
echo "Successfully created Application Insights '$appInsightsName'"

# Start publishing
echo "Publishing API Functions to '$functionAppName' Function App"

# Install the Microsoft package repository GPG key, to validate package integrity
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

# Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update

# Install the Core Tools package
sudo apt-get install azure-functions-core-tools

# change directory to the functions folder to publish
cd "../../web-api/dist"

#publish the functions to the functionAppName
func azure functionapp publish $functionAppName --javascript

echo "Successfully published"