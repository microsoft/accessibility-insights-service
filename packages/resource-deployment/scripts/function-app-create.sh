#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export resourceName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -e <environment>
"
    exit 1
}

# Set default ARM Function App template files
templateFilePath="${0%/*}/../templates/function-app-template.json"

# Read script arguments
while getopts "r:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [ -z $resourceGroupName ] || [ -z $environment ]; then
    exitWithUsageInfo
fi

# Will return the function name if we deployed before the function app template on this resource group
functionAppName=$(az group deployment show -g "$resourceGroupName" -n "function-app-template"  --query "properties.parameters.name.value" -o tsv)

# Boolean to track if we should create a new App Registration or there's one already existing
createNewApp=true
 
# Check if the Function App name is valid and the Function App exists
if [ ! -z "$functionAppName" ] && (az functionapp show -n "$functionAppName" -g "$resourceGroupName" 1>/dev/null); then
    # Get the Client (App) ID for the App Registration that's used for this Function App authentication
    clientId=$(az webapp auth show -n "$functionAppName" -g "$resourceGroupName" --query "clientId" -o tsv)
    # Check if the App Registration name is valid and the App Registration exists
    if [ ! -z "$clientId" ] && (az ad app show --id "$clientId" 1>/dev/null); then
        # If we hit this line, that means we don't need to create a new App Registration
        createNewApp=false
    fi
fi

if ("$createNewApp" = true); then
    appRegistrationName="allyappregistration_${environment}_${resourceGroupName}"
    clientId=$(az ad app create --display-name "$appRegistrationName" --query "appId" -o tsv)
    echo "Successfully created '$appRegistrationName' App Registration with Client ID '$clientId'"
else
    appRegistrationName=$(az ad app show --id "$clientId" --query "displayName" -o tsv)
    echo "'$appRegistrationName' App Registration with Client ID '$clientId' already exists"
fi

# Start deployment
echo "Deploying Function App using ARM template"
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --parameters '{ "clientId": {"value":"'$clientId'"}}' \
    --query "properties.outputResources[].id" \
    -o tsv)

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
functionAppName=$resourceName
echo "Successfully deployed Function App '$functionAppName'"

# Enable continue on error in case the redirect URl was already added before
set +e
# add the reply url to the app registration reply urls
az ad app update --id $clientId --add replyUrls "https://${functionAppName}.azurewebsites.net/.auth/login/aad/callback"
# Disable continue on error in case the redirect URl was already added before
set -e

# Start publishing
echo "Publishing API functions to '$functionAppName' Function App"

# Install the Azure Functions Core Tools: https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2

# Install the Microsoft package repository GPG key, to validate package integrity
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

# Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update

# Install the Core Tools package
sudo apt-get install azure-functions-core-tools

# change directory to the functions folder to publish
cd "${0%/*}/../../../web-api/dist"

#publish the functions to the functionAppName
func azure functionapp publish $functionAppName --node

echo "Successfully published API functions to '$functionAppName' Function App"
