#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

defaultSiteContentFolder="../../../e2e-test-site/dist/site-content/"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription> [-c <site content folder location, defaults to $defaultSiteContentFolder>]
"
    exit 1
}

while getopts ":r:c:s:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) siteContentFolder=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

if [[ ! -z $subscription ]]; then
    echo "Logging into subscription $subscription"
    az account set --subscription "$subscription"
fi

if [[ -z $siteContentFolder ]]; then
    siteContentFolder=$defaultSiteContentFolder
fi

templateFile="${0%/*}/../templates/e2e-site-storage.template.json"

deployStorageAccount() {
    echo "Deploying storage account under resource group '$resourceGroupName' using ARM template $templateFile"
    resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "$templateFile" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
    storageAccountName="$resourceName"

    if [[ -z $storageAccountName ]]; then
        echo "Unable to get storage account name from storage account creation response"
        exit 1
    fi

    enableStaticSiteHosting
}

enableStaticSiteHosting() {
    echo "Enabling static website hosting on storage account $storageAccountName"
    az storage blob service-properties update --account-name $storageAccountName --static-website true --index-document index.html 1>/dev/null

    siteUrl=$(az storage account show --name $storageAccountName --resource-group $resourceGroupName --query "primaryEndpoints.web" --output tsv)
    echo "Site hosting enabled at $siteUrl"
}

uploadSiteContents() {
    sitePath=$(date "+%Y-%m-%d")

    echo "Uploading site contents to folder $sitePath from source folder $siteContentFolder in storage account"

    az storage blob upload-batch --account-name $storageAccountName --destination "\$web" --destination-path "/$sitePath/" --source "$siteContentFolder" 1>/dev/null
}

deployStorageAccount
uploadSiteContents

echo "Deployment of E2E test site complete"
echo "The test site homepage can be found at $siteUrl$sitePath/index.html"

