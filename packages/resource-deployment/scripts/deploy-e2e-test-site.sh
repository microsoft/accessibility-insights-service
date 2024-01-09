#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

defaultSiteContentFolder="${0%/*}/../../../e2e-test-site/dist/site-content"
defaultConfigFileFolder="${0%/*}/../runtime-config"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription>] [-c <site content directory, default $defaultSiteContentFolder>] [-f <service config files directory, default $defaultConfigFileFolder >]
"
    exit 1
}

while getopts ":r:c:s:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) siteContentFolder=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    f) configFileFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

if [[ -z $subscription ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

if [[ -z $siteContentFolder ]]; then
    siteContentFolder=$defaultSiteContentFolder
fi

if [[ -z $configFileFolder ]]; then
    configFileFolder=$defaultConfigFileFolder
fi

templateFile="${0%/*}/../templates/e2e-site-storage.template.json"

deployStorageAccount() {
    echo "Deploying storage account under resource group $resourceGroupName using ARM template $templateFile"
    resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "$templateFile" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
    storageAccountName="$resourceName"

    if [[ -z $storageAccountName ]]; then
        echo "Unable to get storage account name from storage account creation response"
        exit 1
    fi
}

enableStaticSiteHosting() {
    echo "Enabling static website hosting on storage account $storageAccountName"
    az storage blob service-properties update --account-name $storageAccountName --static-website true --index-document index.html --auth-mode login 1>/dev/null

    siteUrl=$(az storage account show --name $storageAccountName --resource-group $resourceGroupName --auth-mode login --query "primaryEndpoints.web" --output tsv)
    echo "Site hosting enabled at $siteUrl"
}

uploadSiteContents() {
    echo "Uploading site contents from source folder $siteContentFolder in storage account"
    az storage blob upload-batch --account-name $storageAccountName --destination "\$web" --source "$siteContentFolder" --overwrite=true --auth-mode login 1>/dev/null
}

updateConfigFiles() {
    echo "Updating service configuration test website endpoint"
    for configFilePath in "$configFileFolder"/*.json; do
        tempFilePath="${0%/*}/temp-$(date +%s)$RANDOM.json"
        jq "if .availabilityTestConfig.urlToScan then . else .availabilityTestConfig += {\"urlToScan\": \"$siteUrl\"} end" $configFilePath >$tempFilePath && mv $tempFilePath $configFilePath
    done
}

deployStorageAccount
enableStaticSiteHosting
uploadSiteContents
updateConfigFiles

echo "Deployment of test website completed. Website URL $siteUrl"
