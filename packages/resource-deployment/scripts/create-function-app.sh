#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

export resourceGroupName
export environment
export keyVault
export principalId

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

templatesFolder="${0%/*}/../templates/"
webApiFuncTemplateFilePath=${templatesFolder}/function-web-api-app-template.json
webWorkersFuncTemplateFilePath=${templatesFolder}/function-web-workers-app-template.json
e2eWebApiFuncTemplateFilePath=${templatesFolder}/function-e2e-web-api-app-template.json

if [[ -z ${dropFolder} ]]; then
    dropFolder="${0%/*}/../../../"
fi

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} \
-r <resource group> \
-c <Azure AD application client ID> \
-e <environment> \
-d <path to drop folder. Will use ${dropFolder} folder relative to current working directory> \
-v <release version>
"
    exit 1
}

getAllowedApplications() {
    if [[ ${environment} == prod* ]]; then
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-prod.txt"
    elif [[ ${environment} == ppe* ]]; then
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-ppe.txt"
    else
        aclFilePath="${0%/*}/../templates/web-api-aad-acl-${environment}.txt"
    fi

    if [[ -f ${aclFilePath} ]]; then
        echo "Using Azure Functions ACL configuration ${aclFilePath}"
        allowedApplications=$(<"${aclFilePath}")
    else
        echo "Azure Functions ACL configuration file not found. Expected configuration file ${aclFilePath}"
    fi

    # The webApiIdentityClientId is application (client) id of the user assigned managed identity used by the service
    if [[ -z ${allowedApplications} ]]; then
        allowedApplications="${webApiIdentityClientId}"
    else
        allowedApplications="${allowedApplications},${webApiIdentityClientId}"
    fi

    # The servicePrincipalId is Azure DevOps service connection application (client) id used by release pipeline.
    # Set by Azure DevOps environment. Task option 'Access service principal details in script' should be enabled.
    if [[ -n ${servicePrincipalId} ]]; then
        allowedApplications="${allowedApplications},${servicePrincipalId}"
        echo "Added Azure DevOps service connection with application (client) ID ${servicePrincipalId} to REST API ACL"
    fi
}

copyConfigFileToScriptFolder() {
    local packageName=$1

    echo "Copying config file to ${packageName} script folder..."
    for folderName in "${dropFolder}"/"${packageName}"/dist/*-func; do
        if [[ -d ${folderName} ]]; then
            cp "${dropFolder}/resource-deployment/dist/runtime-config/runtime-config.${environment}.json" "${folderName}/runtime-config.json"
            echo "  Successfully copied ${environment} config file to ${folderName}"
        fi
    done
}

publishFunctionAppScripts() {
    local packageName=$1
    local functionAppName=$2

    currentDir=$(pwd)
    # Copy config file to function app deployment folder
    copyConfigFileToScriptFolder "${packageName}"

    # Change directory to the function app scripts folder
    cd "${0%/*}/../../../${packageName}/dist"

    # Publish the function scripts to the blob storage
    echo "Publishing ${packageName} scripts to ${functionAppName} function app..."

    zipFileName="${functionAppName}.zip"
    rm "${zipFileName}" || true 1>/dev/null
    # Fallback to PowerShell if zip command is not available
    zip -r "${zipFileName}" . || powershell Compress-Archive ".\*" "${zipFileName}"

    echo "Uploading ${zipFileName} deployment package file to blob storage..."
    az storage blob upload --account-name "${storageAccountName}" --container-name "function-apps" --file "${zipFileName}" --name "${zipFileName}" --overwrite=true --auth-mode login 1>/dev/null

    echo "Successfully published ${packageName} scripts to ${functionAppName} function app."
    cd "${currentDir}"
}

waitForFunctionStart() {
    local functionAppName=$1

    az functionapp start --resource-group "${resourceGroupName}" --name "${functionAppName}"

    functionAppRunningQuery="az functionapp list -g ${resourceGroupName} --query \"[?name=='${functionAppName}' && state=='Running'].name\" -o tsv"
    . "${0%/*}/wait-for-deployment.sh" -n "${functionAppName}" -t "300" -q "${functionAppRunningQuery}"
}

getFunctionAppPrincipalId() {
    local functionAppName=$1

    principalId=$(az functionapp identity show --name "${functionAppName}" --resource-group "${resourceGroupName}" --query "principalId" -o tsv)
    echo "Azure function app ${functionAppName} has assigned principal ID ${principalId}."
}

deployFunctionAppTemplate() {
    local functionAppNamePrefix=$1
    local templateFilePath=$2
    local functionAppName=$3
    local extraParameters=$4

    echo "Deploying Azure function app ${functionAppName} using ARM template..."
    az deployment group create \
        --resource-group "${resourceGroupName}" \
        --template-file "${templateFilePath}" \
        --parameters namePrefix="${functionAppNamePrefix}" $extraParameters \
        --query "properties.outputResources[].id" \
        -o tsv 1>/dev/null

    waitForFunctionStart "${functionAppName}"
    echo "Successfully deployed Azure function app ${functionAppName}"
}

function enableCosmosAccess() {
    cosmosAccountId=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query id -o tsv)
    scope="--scope ${cosmosAccountId}"

    role="DocumentDB Account Contributor"
    . "${0%/*}/create-role-assignment.sh"

    # Create and assign custom RBAC role
    customRoleName="CosmosDocumentRW"
    RBACRoleId=$(az cosmosdb sql role definition list --account-name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "[?roleName=='${customRoleName}'].id" -o tsv)
    if [[ -z "${RBACRoleId}" ]]; then
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
    az cosmosdb sql role assignment create --account-name "${cosmosAccountName}" \
        --resource-group "${resourceGroupName}" \
        --scope "/" \
        --principal-id "${principalId}" \
        --role-definition-id "${RBACRoleId}" 1>/dev/null
}

function enableApplicationInsightsWriteAccess() {
    role="Monitoring Metrics Publisher"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsightsName}"
    . "${0%/*}/create-role-assignment.sh"

    role="Reader"
    . "${0%/*}/create-role-assignment.sh"
}

function enableApplicationInsightsReadAccess() {
    principalId=${webApiIdentityClientId}
    role="Reader"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsightsName}"
    . "${0%/*}/create-role-assignment.sh"
}

function assignUserIdentity() {
    local functionAppName=$1

    az webapp identity assign --identities "${userIdentityId}" --name "${functionAppName}" --resource-group "${resourceGroupName}" 1>/dev/null
}

function enableStorageAccess() {
    role="Storage Blob Data Contributor"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
    . "${0%/*}/create-role-assignment.sh"

    role="Storage Queue Data Contributor"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
    . "${0%/*}/create-role-assignment.sh"

    role="Storage Table Data Contributor"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
    . "${0%/*}/create-role-assignment.sh"
}

function enableManagedIdentity() {
    echo "Granting access to ${webApiFuncAppName} function service principal..."
    getFunctionAppPrincipalId "${webApiFuncAppName}"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
    enableCosmosAccess
    enableApplicationInsightsWriteAccess
    enableApplicationInsightsReadAccess

    echo "Granting access to ${webWorkersFuncAppName} function service principal..."
    getFunctionAppPrincipalId "${webWorkersFuncAppName}"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
    enableCosmosAccess
    enableApplicationInsightsWriteAccess

    echo "Granting access to ${e2eWebApisFuncAppName} function service principal..."
    getFunctionAppPrincipalId "${e2eWebApisFuncAppName}"
    . "${0%/*}/key-vault-enable-msi.sh"
    enableStorageAccess
}

function deployWebApiFunction() {
    deployFunctionAppTemplate "web-api-allyfuncapp" "${webApiFuncTemplateFilePath}" "${webApiFuncAppName}" "clientId=${webApiIdentityClientId} releaseVersion=${releaseVersion} allowedApplications=${allowedApplications}"
    publishFunctionAppScripts "web-api" "${webApiFuncAppName}"
    assignUserIdentity "${webApiFuncAppName}"
    az functionapp restart --resource-group "${resourceGroupName}" --name "${webApiFuncAppName}"
}

function deployWebWorkersFunction() {
    deployFunctionAppTemplate "web-workers-allyfuncapp" "${webWorkersFuncTemplateFilePath}" "${webWorkersFuncAppName}" "releaseVersion=${releaseVersion}"
    publishFunctionAppScripts "web-workers" "${webWorkersFuncAppName}"
    assignUserIdentity "${webWorkersFuncAppName}"
    az functionapp restart --resource-group "${resourceGroupName}" --name "${webWorkersFuncAppName}"
}

function deployE2EWebApisFunction() {
    deployFunctionAppTemplate "e2e-web-apis-allyfuncapp" "${e2eWebApiFuncTemplateFilePath}" "${e2eWebApisFuncAppName}"
    publishFunctionAppScripts "e2e-web-apis" "${e2eWebApisFuncAppName}"
    assignUserIdentity "${e2eWebApisFuncAppName}"
    az functionapp restart --resource-group "${resourceGroupName}" --name "${e2eWebApisFuncAppName}"
}

function setupAzureFunctions() {
    local functionSetupProcesses=(
        "deployWebApiFunction"
        "deployWebWorkersFunction"
        "deployE2EWebApisFunction")
    runCommandsWithoutSecretsInParallel functionSetupProcesses

    enableManagedIdentity
    echo "Successfully published Azure Functions."
}

# Read script arguments
while getopts ":r:e:d:v:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    d) dropFolder=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${environment} ]] || [[ -z ${releaseVersion} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"

echo "Setting up function apps with arguments:
  resourceGroupName: ${resourceGroupName}
  webApiIdentityName: ${webApiManagedIdentityName}
  environment: ${environment}
  dropFolder: ${dropFolder}
  releaseVersion: ${releaseVersion}
"

webApiIdentityClientId=$(az identity show --name "${webApiManagedIdentityName}" --resource-group "${resourceGroupName}" --query clientId -o tsv)
userIdentityId=$(az identity show --name "${webApiManagedIdentityName}" --resource-group "${resourceGroupName}" --query id -o tsv)

getAllowedApplications
setupAzureFunctions
