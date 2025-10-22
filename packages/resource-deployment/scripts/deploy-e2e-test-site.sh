#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

defaultSiteContentFolder="${0%/*}/../../../e2e-test-site/dist/site-content"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription>] [-c <site content directory, default ${defaultSiteContentFolder}>]
"
    exit 1
}

while getopts ":r:c:s:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    c) siteContentFolder=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${subscription} ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

if [[ -z ${siteContentFolder} ]]; then
    siteContentFolder=${defaultSiteContentFolder}
fi

templateFile="${0%/*}/../templates/e2e-site-storage.template.json"

deployStorageAccount() {
    echo "Deploying storage account under resource group ${resourceGroupName} using ARM template ${templateFile}"
    resources=$(az deployment group create --resource-group "${resourceGroupName}" --template-file "${templateFile}" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "${resources}"
    storageAccountName="${resourceName}"

    if [[ -z ${storageAccountName} ]]; then
        echo "Unable to get storage account name from storage account creation response"
        exit 1
    fi
}

enableStaticSiteHosting() {
    echo "Enabling static website hosting on storage account ${storageAccountName}"
    az storage blob service-properties update --account-name "${storageAccountName}" --static-website true --index-document index.html --auth-mode login 1>/dev/null

    siteUrl=$(az storage account show --name "${storageAccountName}" --resource-group "${resourceGroupName}" --query "primaryEndpoints.web" --output tsv)
}

uploadSiteContents() {
    echo "Uploading site contents from source folder ${siteContentFolder} in storage account"
    az storage blob upload-batch --account-name "${storageAccountName}" --destination "\$web" --source "${siteContentFolder}" --overwrite=true --auth-mode login 1>/dev/null
}

updateOpenApiSpec() {
    apiManagementId=$(az resource list --resource-group "${resourceGroupName}" --name "${apiManagementName}" --query "[0].id" -o tsv)
    if [[ -n ${apiManagementId} ]]; then
        echo "Updating OpenAPI specification"
        openApiFilePath="${siteContentFolder}/openapi.json"
        tempFilePath="${0%/*}/temp-$(date +%s)${RANDOM}.json"
        gatewayUrl=$(az apim show --name "${apiManagementName}" --resource-group "${resourceGroupName}" --query "gatewayUrl" -o tsv)
        jq "if .servers[0].url then . else .servers[0] += {\"url\": \"${gatewayUrl}\"} end" "${openApiFilePath}" >"${tempFilePath}" && mv "${tempFilePath}" "${openApiFilePath}"
    fi
}

. "${0%/*}/get-resource-names.sh"

updateOpenApiSpec
deployStorageAccount
enableStaticSiteHosting
uploadSiteContents

echo "Deployment of test website completed. Website URL ${siteUrl}"
