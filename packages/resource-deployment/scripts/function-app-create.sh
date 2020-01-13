#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export resourceName
export webApiAdClientId
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
-d <path to drop folder. Will use '$dropFolder' folder relative to current working directory> \
-v <release version>
"
    exit 1
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
    functionAppName=$2

    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder $packageName

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../$packageName/dist"

    # Publish the function scripts to the function app
    echo "Publishing '$packageName' scripts to '$functionAppName' Function App..."

    # Run function tool with retries due to app service warm up time delay
    end=$((SECONDS + 120))
    while [ $SECONDS -le $end ]; do
        func azure functionapp publish $functionAppName --node || true
        if [ $? -eq 0 ]; then
            break
        fi
        sleep 5
    done

    if [ $? -ne 0 ]; then
        echo "Publishing '$packageName' scripts to '$functionAppName' Function App was unsuccessful."
        exit 1
    fi

    echo "Successfully published '$packageName' scripts to '$functionAppName' Function App."
    cd "$currentDir"
}

waitForFunctionAppServiceDeploymentCompletion() {
    functionAppName=$1

    functionAppRunningQuery="az functionapp list -g $resourceGroupName --query \"[?name=='$functionAppName' && state=='Running'].name\" -o tsv"
    . "${0%/*}/wait-for-deployment.sh" -n "$functionAppName" -t "300" -q "$functionAppRunningQuery"
}

getFunctionAppPrincipalId() {
    functionAppName=$1

    echo "Fetching principal ID of the Azure Function App..."
    principalId=$(az functionapp identity show --name $functionAppName --resource-group $resourceGroupName --query "principalId" -o tsv)
    echo "  Successfully fetched principal ID $principalId."
}

deployWebApiArmTemplate() {
    functionAppNamePrefix="web-api-allyfuncapp"
    templateFilePath="${0%/*}/../templates/function-web-api-app-template.json"

    echo "Deploying Azure Function App using ARM template..."
    resources=$(az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters clientId="$webApiAdClientId" namePrefix="$functionAppNamePrefix" releaseVersion="$releaseVersion" \
        --query "properties.outputResources[].id" \
        -o tsv)

    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
    webApiFunctionAppName="$resourceName"

    waitForFunctionAppServiceDeploymentCompletion $webApiFunctionAppName
    echo "Successfully deployed Azure Function App '$webApiFunctionAppName'"
}

deployWebWorkersArmTemplate() {
    functionAppNamePrefix="web-workers-allyfuncapp"
    templateFilePath="${0%/*}/../templates/function-web-workers-app-template.json"

    echo "Deploying Azure Function App using ARM template..."
    resources=$(az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters namePrefix="$functionAppNamePrefix" releaseVersion="$releaseVersion" \
        --query "properties.outputResources[].id" \
        -o tsv)

    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
    webWorkersFunctionAppName="$resourceName"

    waitForFunctionAppServiceDeploymentCompletion $webWorkersFunctionAppName
    echo "Successfully deployed Azure Function App '$webWorkersFunctionAppName'"
}

deployWebApiFunctionApp() {
    deployWebApiArmTemplate $webApiPackageName

    # Keep child script call only one function level deep to preserve exports
    getFunctionAppPrincipalId $webApiFunctionAppName
    . "${0%/*}/key-vault-enable-msi.sh"
}

deployWebWorkersFunctionApp() {
    deployWebWorkersArmTemplate $webWorkersPackageName

    # Keep child script call only one level deep to preserve exports
    getFunctionAppPrincipalId $webWorkersFunctionAppName
    . "${0%/*}/key-vault-enable-msi.sh"
}

# Read script arguments
while getopts ":r:c:e:k:d:v:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    v) releaseVersion=${OPTARG};;
    *) exitWithUsageInfo ;;
    esac
done

if [ -z $resourceGroupName ] || [ -z $environment ] || [ -z $keyVault ] || [ -z $webApiAdClientId ]; then
    exitWithUsageInfo
fi

installAzureFunctionsCoreTools

webWorkersPackageName="web-workers"
webApiPackageName="web-api"

deployWebWorkersFunctionApp
deployWebApiFunctionApp

publishFunctionAppScripts $webApiPackageName $webApiFunctionAppName
publishFunctionAppScripts $webWorkersPackageName $webWorkersFunctionAppName

# Export the last created web-api function app service name to be used by the API Management install script
functionAppName="$webApiFunctionAppName"
