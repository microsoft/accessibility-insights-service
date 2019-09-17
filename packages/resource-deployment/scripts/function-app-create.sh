#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export resourceName
export clientId
export environment
export keyVault
export packageName
export functionAppNamePrefix

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

exitWithUsageInfo() {
    echo "
Usage: $0 \
-r <resource group> \
-c <Azure AD application client id> \
-e <environment> \
-f <function app name prefix> \
-p <function app package name> \
-k <Key Vault to grant Azure Function App an access to> \
-d <path to drop folder. Will use '$dropFolder' folder relative to current working directory>
"
    exit 1
}

addReplyUrlIfNotExists() {
    clientId=$1
    functionAppName=$2

    # Get existing reply urls of the AAD app registration
    echo "Fetching existing reply URls of the Azure Function AAD application..."
    replyUrls=$(az ad app show --id $clientId --query "replyUrls" -o tsv) || true
    replyUrl="https://${functionAppName}.azurewebsites.net/.auth/login/aad/callback"

    for url in $replyUrls; do
        if [[ $url == $replyUrl ]]; then
            echo "Reply Url '${replyUrl}' already exsits. Skipping adding reply URL to Azure Function AAD app application."
            return
        fi
    done

    echo "Adding reply URL '$replyUrl' to Azure Function AAD app application..."
    az ad app update --id $clientId --add replyUrls $replyUrl
    echo "  Successfully added reply URL."
}

createAppRegistration() {
    resourceGroupName=$1
    environment=$2

    appRegistrationName="allyappregistration-$resourceGroupName-$environment"
    echo "Creating a new ADD application with display name $appRegistrationName..."
    clientId=$(az ad app create --display-name "$appRegistrationName" --query "appId" -o tsv)
    echo "  Successfully created '$appRegistrationName' AAD application with client ID '$clientId'"
}

copyConfigFileToScriptFolder() {
    echo "Copying config file to '$packageName' script folder..."
    for folderName in $dropFolder/$packageName/dist/*-func; do
        if [[ -d $folderName ]]; then
            cp "$dropFolder/resource-deployment/dist/runtime-config/runtime-config.$environment.json" "$folderName/runtime-config.json"
            echo "  Successfully copied '$environment' config file to $folderName"
        fi
    done
}

installAzureFunctionsCoreToolsOnLinux() {
    # Install the Azure Functions Core Tools. Refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2

    # Install the Microsoft package repository GPG key, to validate package integrity
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor >microsoft.gpg
    sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

    # Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
    sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
    sudo apt-get update

    # Install the Core Tools package
    sudo apt-get install azure-functions-core-tools
}

publishFunctionAppScripts() {
    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder $packageName

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../$packageName/dist"

    # Publish the function scripts to the function app
    echo "Publishing '$packageName' scripts..."
    func azure functionapp publish $functionAppName --node

    cd "$currentDir"
}

# Set default ARM Azure Function App template files
templateFilePath="${0%/*}/../templates/function-app-template.json"

# Read script arguments
while getopts "r:c:e:k:d:f:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    f) functionAppNamePrefix=${OPTARG} ;;
    p) packageName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [ -z $resourceGroupName ] || [ -z $environment ] || [ -z $keyVault ] || [ -z $packageName ]; then
    exitWithUsageInfo
fi

if [ -z $functionAppNamePrefix ]; then
    functionAppNamePrefix="$packageName-allyfuncapp"
fi

if [ -z $clientId] && [ ! $environment = "dev" ]; then
    echo "AAD application client ID option is required for the non-dev environment."
    exitWithUsageInfo
fi

# Create AAD function application for dev deployment only if not exists
if [ -z $clientId ]; then
    echo "Create AAD application for the development environment if not exists..."
    functionAppName=$(az group deployment show -g "$resourceGroupName" -n "function-app-template" --query "properties.parameters.name.value" -o tsv 2>/dev/null) || true
    clientId=$(az webapp auth show -n "$functionAppName" -g "$resourceGroupName" --query "clientId" -o tsv 2>/dev/null) || true
    appRegistrationName=$(az ad app show --id "$clientId" --query "displayName" -o tsv 2>/dev/null) || true

    if [[ ! -n $appRegistrationName ]]; then
        createAppRegistration $resourceGroupName $environment
    else
        echo "ADD application with display name '$appRegistrationName' already exists."
    fi
fi

# Start function app deployment
echo "Deploying Azure Function App using ARM template..."
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --parameters clientId="$clientId" namePrefix="$functionAppNamePrefix" \
    --query "properties.outputResources[].id" \
    -o tsv)

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
functionAppName=$resourceName
echo "Successfully deployed Azure Function App '$functionAppName'"

# Add reply url to function app registration
if [ $environment = "dev" ]; then
    addReplyUrlIfNotExists $clientId $functionAppName
fi

# Grant key vault access to function app
echo "Fetching principal ID of the Azure Function App..."
principalId=$(az functionapp identity show --name $functionAppName --resource-group $resourceGroupName --query "principalId" -o tsv)
echo "  Successfully fetched principal ID $principalId"

. "${0%/*}/key-vault-enable-msi.sh"

# Start publishing function scripts
echo "Publishing API functions to '$functionAppName' Function App"

# Install Azure Functions Core Tools for non-dev environment
osVersion="$(uname -s)"
case "${unameOut}" in
Linux*) installAzureFunctionsCoreToolsOnLinux ;;
*) echo "Azure Functions Core Tools is expected to be installed on development computer. Refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2 if tools is not installed." ;;
esac

# Publish the function scripts to the function app
publishFunctionAppScripts

echo "Successfully published API functions to '$functionAppName' Function App."
