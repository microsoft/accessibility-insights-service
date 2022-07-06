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

getStorageConnectionString() {
    storageConnectionString=$(az storage account show-connection-string --name "$storageAccountName" --resource-group "$resourceGroupName" --subscription "$subscription" --query connectionString --out tsv)
}

getCosmosDbConnectionString() {
    cosmosDbConnectionString=$(az cosmosdb keys list --type connection-strings --name "$cosmosAccountName" --resource-group "$resourceGroupName" --subscription "$subscription" --query connectionStrings[0].connectionString --out tsv)
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
. "${0%/*}/create-sp-for-debug.sh"

getCosmosDbUrl
getCosmosDbAccessKey
getStorageConnectionString
getCosmosDbConnectionString
getAppInsightKey
getBatchAccountEndpoint

echo -e "
Copy below output into .env file
START of .env file >>> \033[32m

SUBSCRIPTION=$subscription
RESOURCE_GROUP=$resourceGroupName

AZ_BATCH_ACCOUNT_NAME=$batchAccountName
AZ_BATCH_ACCOUNT_URL=https://$batchAccountEndpoint/
AZURE_STORAGE_SCAN_QUEUE=ondemand-scanrequest
AZURE_STORAGE_PRIVACY_SCAN_QUEUE=privacy-scan-request
AZURE_STORAGE_NAME=$storageAccountName
KEY_VAULT_URL=https://$keyVault.vault.azure.net/
APPINSIGHTS_INSTRUMENTATIONKEY=$appInsightInstrumentationKey
COSMOS_DB_URL=$cosmosDbUrl
COSMOS_DB_KEY=$cosmosDbAccessKey

AZURE_TENANT_ID=$tenant
AZURE_CLIENT_ID=$clientId
AZURE_CLIENT_SECRET=$password

AZ_BATCH_POOL_ID=
AZ_BATCH_JOB_ID=1-dev-test-job
AZ_BATCH_TASK_ID=dev-test-task

URL=
ID=
DEEPSCAN=
SCANGROUPID=
TARGETREPORT=

WEB_API_BASE_URL=

HEADLESS=false
DEVTOOLS=true
X_FORWARDED_FOR_HTTP_HEADER=
EXTENSION_ID=
EXTENSION_NAME=

\033[0m <<< END of .env file

Copy below output into Azure Function local.settings.json configuration file.
START of local.settings.json file >>> \033[32m

{
    \"IsEncrypted\": false,
    \"Values\": {
        \"FUNCTIONS_WORKER_RUNTIME\": \"node\",
        \"AzureWebJobsStorage\": \"$storageConnectionString\",
        \"COSMOS_CONNECTION_STRING\": \"$cosmosDbConnectionString\"
    }
}

\033[0m <<< END of local.settings.json file
"
