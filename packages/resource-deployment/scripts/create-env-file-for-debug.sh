#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create set of environment variables to use for service local debugging

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-s <subscription name or id>]
"
    exit 1
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "documentEndpoint" -o tsv)

    if [[ -z $cosmosDbUrl ]]; then
        echo "Unable to get cosmos DB URL for cosmos account $cosmosAccountName"
        exit 1
    fi
}

getCosmosDbAccessKey() {
    cosmosDbAccessKey=$(az cosmosdb keys list --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "primaryMasterKey" -o tsv)

    if [[ -z $cosmosDbAccessKey ]]; then
        echo "Unable to get access key for cosmos DB account $cosmosAccountName"
        exit 1
    fi
}

getStorageAccessKey() {
    storageAccountKey=$(az storage account keys list --account-name "$storageAccountName" --query "[0].value" -o tsv)

    if [[ -z $storageAccountKey ]]; then
        echo "Unable to get access key for storage account $storageAccountName"
        exit 1
    fi
}

getAppInsightKey() {
    id="/subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/microsoft.insights/components/$appInsightsName"
    appInsightInstrumentationKey=$(az resource show --id "$id" --query properties.InstrumentationKey --out tsv)
}

getBatchAccountEndpoint() {
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"
    batchAccountEndpoint=$(az batch account show --query accountEndpoint --out tsv)
}

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

# Read script arguments
while getopts ":s:r:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $subscription ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/create-sp-for-key-vault.sh" 1>/dev/null

getCosmosDbUrl
getCosmosDbAccessKey
getStorageAccessKey
getAppInsightKey
getBatchAccountEndpoint

# Generate environment variable file template
echo "
Copy below output into .env file. Update AZ_BATCH_* variables as per debugging project.


SUBSCRIPTION=$subscription
RESOURCE_GROUP=$resourceGroupName

JOB-MANAGER_VARIABLES=
AZ_BATCH_ACCOUNT_NAME=$batchAccountName
AZ_BATCH_ACCOUNT_URL=https://$batchAccountEndpoint/
AZ_BATCH_POOL_ID=on-demand-url-scan-pool
AZ_BATCH_JOB_ID=1-on-demand-url-scan-schedule-job
AZ_BATCH_TASK_ID=on-demand-url-scan-job-manager-task

SCAN-REQUEST-SENDER_VARIABLES=
QUEUE_SIZE=3

COMMON_VARIABLES=
AZURE_STORAGE_SCAN_QUEUE=ondemand-scanrequest
KEY_VAULT_URL=https://$keyVault.vault.azure.net/
APPINSIGHTS_INSTRUMENTATIONKEY=$appInsightInstrumentationKey

COSMOS_DB_URL=$cosmosDbUrl
COSMOS_DB_KEY=$cosmosDbAccessKey

AZURE_STORAGE_NAME=$storageAccountName
AZURE_STORAGE_KEY=$storageAccountKey

SP_CLIENT_ID=$clientId
SP_TENANT=$tenant
SP_PASSWORD=$password
"
