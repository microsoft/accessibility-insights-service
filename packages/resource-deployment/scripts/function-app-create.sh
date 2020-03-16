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
-d <path to drop folder. Will use '$dropFolder' folder relative to current working directory> \
-v <release version>
"
    exit 1
}

copyConfigFileToScriptFolder() {
    local packageName=$1

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
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
    sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

    # Verify your Ubuntu server is running one of the appropriate versions from the table below. To add the apt source, run
    sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
    sudo apt-get update -y

    # Install the Core Tools package
    sudo apt-get install azure-functions-core-tools=2.7.1948-1 -y
    echo "Azure Functions Core Tools installed successfully"
}

installAzureFunctionsCoreTools() {
    local kernelName=$(uname -s 2>/dev/null) || true
    echo "OS kernel name: $kernelName"
    case "${kernelName}" in
    Linux*) installAzureFunctionsCoreToolsOnLinux ;;
    *) echo "Azure Functions Core Tools is expected to be installed on development computer. Refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2 if tools is not installed." ;;
    esac
}

publishFunctionAppScripts() {
    local packageName=$1
    local functionAppName=$2

    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder $packageName

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../$packageName/dist"

    # Publish the function scripts to the function app
    echo "Publishing '$packageName' scripts to '$functionAppName' Function App..."

    # Run function tool with retries due to app service warm up time delay
    local isPublished=false
    end=$((SECONDS + 120))
    while [ $SECONDS -le $end ] && [ "$isPublished" = false ]; do
        {
            isPublished=true
            func azure functionapp publish $functionAppName --node
        } || {
            echo "Failed to publish, retrying..."
            isPublished=false
        }

        if [ "$isPublished" = false ]; then
            sleep 5
        fi
    done

    if [ "$isPublished" = false ]; then
        echo "Publishing '$packageName' scripts to '$functionAppName' Function App was unsuccessful."
        exit 1
    fi

    echo "Successfully published '$packageName' scripts to '$functionAppName' Function App."
    cd "$currentDir"
}

waitForFunctionAppServiceDeploymentCompletion() {
    local functionAppName=$1

    functionAppRunningQuery="az functionapp list -g $resourceGroupName --query \"[?name=='$functionAppName' && state=='Running'].name\" -o tsv"
    . "${0%/*}/wait-for-deployment.sh" -n "$functionAppName" -t "300" -q "$functionAppRunningQuery"
}

getFunctionAppPrincipalId() {
    local functionAppName=$1

    echo "Fetching principal ID of the Azure Function App..."
    principalId=$(az functionapp identity show --name $functionAppName --resource-group $resourceGroupName --query "principalId" -o tsv)
    echo "  Successfully fetched principal ID $principalId."
}

deployFunctionApp() {
    local functionAppNamePrefix=$1
    local templateFilePath=$2
    local functionAppName=$3
    local extraParameters=$4

    echo "Deploying Azure Function App $functionAppName using ARM template..."
    resources=$(az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters namePrefix="$functionAppNamePrefix" releaseVersion="$releaseVersion" $extraParameters \
        --query "properties.outputResources[].id" \
        -o tsv)

    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
    local myFunctionAppName="$resourceName"

    waitForFunctionAppServiceDeploymentCompletion $myFunctionAppName
    echo "Successfully deployed Azure Function App '$myFunctionAppName'"
}

function deployWebApiFunction {
    deployFunctionApp "web-api-allyfuncapp" "${0%/*}/../templates/function-web-api-app-template.json" "$webApiFuncAppName" "clientId=$webApiAdClientId"
}

function deployWebWorkersFunction {
    deployFunctionApp "web-workers-allyfuncapp" "${0%/*}/../templates/function-web-workers-app-template.json" "$webWorkersFuncAppName"
}

function enableManagedIdentityOnFunctions {
    getFunctionAppPrincipalId $webApiFuncAppName
    . "${0%/*}/key-vault-enable-msi.sh"

    getFunctionAppPrincipalId $webWorkersFuncAppName
    . "${0%/*}/key-vault-enable-msi.sh"
}

function publishWebApiScripts {
    publishFunctionAppScripts "web-api" $webApiFuncAppName
}

function publishWebWorkerScripts {
    publishFunctionAppScripts "web-workers" $webWorkersFuncAppName
}

function setupAzureFunctions {
    installAzureFunctionsCoreTools

    local functionSetupProcesses=(
        "deployWebApiFunction"
        "deployWebWorkersFunction"
    )
    runCommandsWithoutSecretsInParallel functionSetupProcesses

    enableManagedIdentityOnFunctions

    functionSetupProcesses=(
        "publishWebApiScripts"
        "publishWebWorkerScripts"
    )
    runCommandsWithoutSecretsInParallel functionSetupProcesses

    echo "Successfully published setup all Azure Functions."
}

# Read script arguments
while getopts ":r:c:e:d:v:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    v) releaseVersion=${OPTARG};;
    *) exitWithUsageInfo ;;
    esac
done

echo "Setting up function apps with arguments passed:
    resourceGroupName: $resourceGroupName
    webApiAdClientId: $webApiAdClientId
    environment: $environment
    dropFolder: $dropFolder
    releaseVersion: $releaseVersion
"

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"


if [[ -z $resourceGroupName ]] || [[ -z $environment ]] || [[ -z $releaseVersion ]] || [[ -z $webApiAdClientId ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

setupAzureFunctions
