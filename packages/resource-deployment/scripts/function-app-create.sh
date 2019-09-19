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
export principalId

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

exitWithUsageInfo() {
    echo "
Usage: $0 \
-r <resource group> \
-c <Azure AD application client ID> \
-e <environment> \
-k <Key Vault to grant Azure Function App an access to> \
-d <path to drop folder. Will use '$dropFolder' folder relative to current working directory>
"
    exit 1
}

addReplyUrlToAadApp() {
    # Get existing reply urls of the AAD app registration
    echo "Fetching existing reply URls of the Azure Function AAD application..."
    replyUrls=$(az ad app show --id $clientId --query "replyUrls" -o tsv) || true
    replyUrl="https://${currentFunctionAppName}.azurewebsites.net/.auth/login/aad/callback"

    for url in $replyUrls; do
        if [[ $url == $replyUrl ]]; then
            echo "Reply Url '${replyUrl}' already exsits. Skipping adding reply URL to Azure Function AAD app application."
            return
        fi
    done

    echo "Adding reply URL '$replyUrl' to Azure Function AAD application..."
    az ad app update --id $clientId --add replyUrls $replyUrl
    echo "  Successfully added reply URL."
}

createAppRegistration() {
    packageName=$1

    appRegistrationName="$packageName-func-app-$resourceGroupName-$environment"
    echo "Creating a new AAD application with display name $appRegistrationName..."
    clientId=$(az ad app create --display-name "$appRegistrationName" --query "appId" -o tsv)
    echo "  Successfully created '$appRegistrationName' AAD application with client ID '$clientId'"
}

createAppRegistrationIfNotExists() {
    packageName=$1

    if [ -z $clientId ]; then
        echo "Create AAD application..."
        currentFunctionAppName=$(az group deployment show -g "$resourceGroupName" -n "function-app-template" --query "properties.parameters.name.value" -o tsv 2>/dev/null) || true
        clientId=$(az webapp auth show -n "$currentFunctionAppName" -g "$resourceGroupName" --query "clientId" -o tsv 2>/dev/null) || true
        appRegistrationName=$(az ad app show --id "$clientId" --query "displayName" -o tsv 2>/dev/null) || true

        if [[ ! -n $appRegistrationName ]]; then
            createAppRegistration $packageName
        else
            echo "AAD application with display name '$appRegistrationName' already exists."
        fi
    fi
}

copyConfigFileToScriptFolder() {
    packageName=$1

    echo "Copying config file to '$packageName' script folder..."
    for folderName in $dropFolder/$packageName/dist/*-func; do
        if [[ -d $folderName ]]; then
            cp "$dropFolder/resource-deployment/dist/runtime-config/runtime-config.$environment.json" "$folderName/runtime-config.json"
            echo "  Successfully copied '$environment' config file to $folderName"
        fi
    done
}

installAzureFunctionsCoreToolsOnLinux() {
    # Refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2

    echo "Installing Azure Functions Core Tools..."
    # Install the Microsoft package repository GPG key, to validate package integrity
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor >microsoft.gpg
    sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

    # Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
    sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
    sudo apt-get update

    # Install the Core Tools package
    sudo apt-get install azure-functions-core-tools
    echo "Azure Functions Core Tools installed successfully"
}

installAzureFunctionsCoreTools() {
    kernelName=$(uname -s 2>/dev/null) || true
    echo "OS kernel name: $kernelName"
    case "${kernelName}" in
    Linux*) installAzureFunctionsCoreToolsOnLinux ;;
    *) echo "Azure Functions Core Tools is expected to be installed on development computer. Refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2 if tools is not installed." ;;
    esac
}

publishFunctionAppScripts() {
    packageName=$1

    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder $packageName

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../$packageName/dist"

    # Publish the function scripts to the function app
    echo "Publishing '$packageName' scripts to '$currentFunctionAppName' Function App..."
    func azure functionapp publish $currentFunctionAppName --node
    echo "Successfully published API functions to '$currentFunctionAppName' Function App."

    cd "$currentDir"
}

waitForFunctionAppServiceDeploymentCompletion() {
    end=$((SECONDS + 300))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        sleep 5
        printf "."
        functionAppState=$(az functionapp list -g $resourceGroupName --query "[?name=='$currentFunctionAppName'].state" -o tsv)
        if [[ $functionAppState == "Running" ]]; then
            break
        fi
    done
    echo "."
}

getFunctionAppPrincipalId() {
    echo "Fetching principal ID of the Azure Function App..."
    principalId=$(az functionapp identity show --name $currentFunctionAppName --resource-group $resourceGroupName --query "principalId" -o tsv)
    echo "  Successfully fetched principal ID $principalId."
}

deployWebApiArmTemplate() {
    packageName=$1

    functionAppNamePrefix="$packageName-allyfuncapp"
    templateFilePath="${0%/*}/../templates/function-web-api-app-template.json"

    echo "Deploying Azure Function App using ARM template..."
    resources=$(az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters clientId="$clientId" namePrefix="$functionAppNamePrefix" \
        --query "properties.outputResources[].id" \
        -o tsv)

    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
    currentFunctionAppName="$resourceName"

    waitForFunctionAppServiceDeploymentCompletion
    echo "Successfully deployed Azure Function App '$currentFunctionAppName'"
}

deployWebWorkersArmTemplate() {
    packageName=$1

    functionAppNamePrefix="$packageName-allyfuncapp"
    templateFilePath="${0%/*}/../templates/function-web-workers-app-template.json"

    echo "Deploying Azure Function App using ARM template..."
    resources=$(az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters namePrefix="$functionAppNamePrefix" \
        --query "properties.outputResources[].id" \
        -o tsv)

    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
    currentFunctionAppName="$resourceName"

    waitForFunctionAppServiceDeploymentCompletion
    echo "Successfully deployed Azure Function App '$currentFunctionAppName'"
}

deployWebApiFunctionApp() {
    packageName=$1

    createAppRegistrationIfNotExists $packageName
    deployWebApiArmTemplate $packageName

    # Add reply url to function app registration
    if [ $environment = "dev" ]; then
        addReplyUrlToAadApp
    fi

    # Keep child script call only one function level deep to preserve exports
    getFunctionAppPrincipalId
    . "${0%/*}/key-vault-enable-msi.sh"

    publishFunctionAppScripts $packageName
}

deployWebWorkersFunctionApp() {
    packageName=$1

    deployWebWorkersArmTemplate $packageName

    # Keep child script call only one level deep to preserve exports
    getFunctionAppPrincipalId
    . "${0%/*}/key-vault-enable-msi.sh"

    publishFunctionAppScripts $packageName
}

# Read script arguments
while getopts ":r:c:e:k:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [ -z $resourceGroupName ] || [ -z $environment ] || [ -z $keyVault ]; then
    exitWithUsageInfo
fi

if [ -z $clientId ] && [ ! $environment = "dev" ]; then
    echo "AAD application client ID option is required for the non-dev environment."
    exitWithUsageInfo
fi

installAzureFunctionsCoreTools

deployWebWorkersFunctionApp "web-workers"
deployWebApiFunctionApp "web-api"

# Export the last created web-api function app service name to be used by the API Management install script
functionAppName="$currentFunctionAppName"
