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

addReplyUrlIfNotExists() {
    clientId=$1
    functionAppName=$2

    # Get existing reply urls of the app registration
    echo "Fetching existing replyUrls..."
    replyUrls=$(az ad app show --id $clientId --query "replyUrls" -o tsv)
    replyUrl="https://${functionAppName}.azurewebsites.net/.auth/login/aad/callback"

    for url in $replyUrls; do
        if [[ $url == $replyUrl ]]; then
            echo "replyUrl ${replyUrl} already exsits."
            return
        fi
    done

    echo "Adding replyUrl $replyUrl to app registration..."
    az ad app update --id $clientId --add replyUrls $replyUrl
    echo "  Successfully added replyUrl."
}

createAppRegistration() {
    resourceGroupName=$1
    environment=$2

    appRegistrationName="allyappregistration-$resourceGroupName-$environment"
    echo "Creating a new AppRegistration with display name $appRegistrationName..."
    clientId=$(az ad app create --display-name "$appRegistrationName" --query "appId" -o tsv)
    echo "  Successfully created '$appRegistrationName' App Registration with Client ID '$clientId'"
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
echo "Checking if the function app already exists..."
functionAppName=$(az group deployment show -g "$resourceGroupName" -n "function-app-template" --query "properties.parameters.name.value" -o tsv)
echo "Checking if the App Registration exists..."
clientId=$(az webapp auth show -n "$functionAppName" -g "$resourceGroupName" --query "clientId" -o tsv) || true
appRegistrationName=$(az ad app show --id "$clientId" --query "displayName" -o tsv) || true

if [[ ! -n $appRegistrationName ]]; then
    createAppRegistration $resourceGroupName $environment
else
    echo "AppRegistration already exists, display name: $appRegistrationName."
fi

# Start function app deployment
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

addReplyUrlIfNotExists $clientId $functionAppName

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
