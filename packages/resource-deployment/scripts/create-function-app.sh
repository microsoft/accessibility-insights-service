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

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

templatesFolder="${0%/*}/../templates/"
webApiFuncTemplateFilePath=$templatesFolder/function-web-api-app-template.json
webWorkersFuncTemplateFilePath=$templatesFolder/function-web-workers-app-template.json
e2eWebApiFuncTemplateFilePath=$templatesFolder/function-e2e-web-api-app-template.json

if [[ -z $dropFolder ]]; then
    dropFolder="${0%/*}/../../../"
fi

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} \
-r <resource group> \
-c <Azure AD application client ID> \
-e <environment> \
-d <path to drop folder. Will use $dropFolder folder relative to current working directory> \
-v <release version>
"
    exit 1
}

addAadAcl() {
    if [[ $environment == "prod" ]] || [[ $environment == "prod-pr" ]]; then
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-prod.json"
    elif [[ $environment == "ppe" ]] || [[ $environment == "ppe-pr" ]]; then
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-ppe.json"
    else
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-dev.json"
    fi

    if [[ -f $aclFilePath ]]; then
        echo "Updating Azure Functions ACL for $webApiFuncTemplateFilePath template..."
        acl=$(<$aclFilePath)
        tempFilePath="${0%/*}/temp-$(date +%s)$RANDOM.json"
        jq "if .resources[].properties.siteConfig.appSettings | map(.name == \"WEBSITE_AUTH_AAD_ACL\") | any then . else .resources[].properties.siteConfig.appSettings += [$acl] end" $webApiFuncTemplateFilePath >$tempFilePath && mv $tempFilePath $webApiFuncTemplateFilePath
    else
        echo "Azure Functions ACL configuration file not found. Expected configuration file $aclFilePath"
    fi
}

copyConfigFileToScriptFolder() {
    local packageName=$1

    echo "Copying config file to $packageName script folder..."
    for folderName in $dropFolder/$packageName/dist/*-func; do
        if [[ -d $folderName ]]; then
            cp "$dropFolder/resource-deployment/dist/runtime-config/runtime-config.$environment.json" "$folderName/runtime-config.json"
            echo "  Successfully copied $environment config file to $folderName"
        fi
    done
}

installAzureFunctionsCoreToolsOnLinux() {
    echo "Installing Azure Functions Core Tools..."
    # Install the Microsoft package repository GPG key, to validate package integrity
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor >microsoft.gpg
    sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg

    # Verify your Ubuntu server is running one of the appropriate versions from the table below
    sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
    sudo apt-get update -y

    # Install Azure Functions Core Tools package
    sudo apt-get install azure-functions-core-tools-4 -y
    echo "Azure Functions Core Tools installed successfully"
}

installAzureFunctionsCoreTools() {
    local funcVersion=$(func version 2>/dev/null) || true
    if [[ -z $funcVersion ]]; then
        local kernelName=$(uname -s 2>/dev/null) || true
        if [[ ${kernelName} == "Linux" ]]; then
            installAzureFunctionsCoreToolsOnLinux
        else
            echo "Azure Functions Core Tools is expected to be installed on a machine. How to install tool, see https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local"
            exit 1
        fi
    fi
}

publishFunctionAppScripts() {
    local packageName=$1
    local functionAppName=$2

    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder "$packageName"

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../$packageName/dist"

    # Publish the function scripts to the function app
    echo "Publishing $packageName scripts to $functionAppName Function App..."

    # Run function tool with retries due to app service warm up time delay
    local isPublished=false
    end=$((SECONDS + 120))
    while [ $SECONDS -le $end ] && [ "$isPublished" = false ]; do
        {
            isPublished=true
            func azure functionapp publish "$functionAppName" --node
        } || {
            echo "Failed to publish, retrying..."
            isPublished=false
        }

        if [ "$isPublished" = false ]; then
            sleep 5
        fi
    done

    if [ "$isPublished" = false ]; then
        echo "Publishing $packageName scripts to $functionAppName Function App was unsuccessful."
        exit 1
    fi

    echo "Successfully published $packageName scripts to $functionAppName Function App."
    cd "$currentDir"
}

waitForDeploymentCompletion() {
    local functionAppName=$1

    az functionapp start --resource-group "$resourceGroupName" --name "$functionAppName"

    functionAppRunningQuery="az functionapp list -g $resourceGroupName --query \"[?name=='$functionAppName' && state=='Running'].name\" -o tsv"
    . "${0%/*}/wait-for-deployment.sh" -n "$functionAppName" -t "300" -q "$functionAppRunningQuery"
}

getFunctionAppPrincipalId() {
    local functionAppName=$1

    principalId=$(az functionapp identity show --name $functionAppName --resource-group $resourceGroupName --query "principalId" -o tsv)
    echo "Azure Function App $functionAppName has assigned principal ID $principalId."
}

deployFunctionApp() {
    local functionAppNamePrefix=$1
    local templateFilePath=$2
    local functionAppName=$3
    local extraParameters=$4

    echo "Deploying Azure Function App $functionAppName using ARM template..."
    resources=$(az deployment group create \
        --resource-group "$resourceGroupName" \
        --template-file "$templateFilePath" \
        --parameters namePrefix="$functionAppNamePrefix" releaseVersion="$releaseVersion" $extraParameters \
        --query "properties.outputResources[].id" \
        -o tsv)

    waitForDeploymentCompletion "$functionAppName"
    echo "Successfully deployed Azure Function App $functionAppName"
}

function deployWebApiFunction() {
    deployFunctionApp "web-api-allyfuncapp" "$webApiFuncTemplateFilePath" "$webApiFuncAppName" "clientId=$webApiAdClientId"
}

function deployWebWorkersFunction() {
    deployFunctionApp "web-workers-allyfuncapp" "$webWorkersFuncTemplateFilePath" "$webWorkersFuncAppName"
}

function deployE2EWebApisFunction() {
    deployFunctionApp "e2e-web-apis-allyfuncapp" "$e2eWebApiFuncTemplateFilePath" "$e2eWebApisFuncAppName"
}

function enableStorageAccess() {
    role="Storage Blob Data Contributor"
    scope="--scope /subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName"
    . "${0%/*}/create-role-assignment.sh"
}

function enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query id -o tsv)
    scope="--scope $cosmosAccountId"

    role="DocumentDB Account Contributor"
    . "${0%/*}/create-role-assignment.sh"

    # Create and assign custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name $cosmosAccountName --resource-group $resourceGroupName --query "[?roleName=='$customRoleName'].id" -o tsv)
    if [[ -z "$RBACRoleId" ]]; then
        echo "Creating a custom RBAC role with read-write permissions"
        RBACRoleId=$(az cosmosdb sql role definition create --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --body "@${0%/*}/../templates/cosmos-db-rw-role.json" \
            --query "id" -o tsv)
        az cosmosdb sql role definition wait --account-name "${cosmosAccountName}" \
            --resource-group "${resourceGroupName}" \
            --id "${RBACRoleId}" \
            --exists 1>/dev/null
    fi
    az cosmosdb sql role assignment create --account-name "$cosmosAccountName" \
        --resource-group "$resourceGroupName" \
        --scope "/" \
        --principal-id "$principalId" \
        --role-definition-id "$RBACRoleId" 1>/dev/null
}

function enableManagedIdentityOnFunctions() {
    echo "Granting access to $webApiFuncAppName function service principal..."
    getFunctionAppPrincipalId "$webApiFuncAppName"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
    enableCosmosAccess

    echo "Granting access to $webWorkersFuncAppName function service principal..."
    getFunctionAppPrincipalId "$webWorkersFuncAppName"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
    enableCosmosAccess

    echo "Granting access to $e2eWebApisFuncAppName function service principal..."
    getFunctionAppPrincipalId "$e2eWebApisFuncAppName"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
}

function publishWebApiScripts() {
    publishFunctionAppScripts "web-api" "$webApiFuncAppName"
}

function publishWebWorkerScripts() {
    publishFunctionAppScripts "web-workers" "$webWorkersFuncAppName"
}

function publishE2EWebApisScripts() {
    publishFunctionAppScripts "e2e-web-apis" "$e2eWebApisFuncAppName"
}

function setupAzureFunctions() {
    installAzureFunctionsCoreTools

    local functionSetupProcesses=(
        "deployWebApiFunction"
        "deployWebWorkersFunction"
        "deployE2EWebApisFunction"
    )
    runCommandsWithoutSecretsInParallel functionSetupProcesses

    enableManagedIdentityOnFunctions

    functionSetupProcesses=(
        "publishWebApiScripts"
        "publishWebWorkerScripts"
        "publishE2EWebApisScripts"
    )
    runCommandsWithoutSecretsInParallel functionSetupProcesses

    echo "Successfully published Azure Functions."
}

# Read script arguments
while getopts ":r:c:e:d:v:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $environment ]] || [[ -z $releaseVersion ]] || [[ -z $webApiAdClientId ]]; then
    exitWithUsageInfo
fi

echo "Setting up function apps with arguments:
  resourceGroupName: $resourceGroupName
  webApiAdClientId: $webApiAdClientId
  environment: $environment
  dropFolder: $dropFolder
  releaseVersion: $releaseVersion
"

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"

addAadAcl
setupAzureFunctions
