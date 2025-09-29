#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create set of environment variables to use for service local debugging

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription name or id>]
"
    exit 1
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "documentEndpoint" -o tsv)

    if [[ -z ${cosmosDbUrl} ]]; then
        echo "Unable to get cosmos DB URL for cosmos account ${cosmosAccountName}"
        exit 1
    fi
}

getAppInsightKey() {
    id="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsightsName}"
    appInsightsConnectionString=$(az resource show --id "${id}" --query properties.ConnectionString --out tsv)
}

getBatchAccountEndpoint() {
    az batch account login --name "${batchAccountName}" --resource-group "${resourceGroupName}"
    batchAccountEndpoint=$(az batch account show --query accountEndpoint --out tsv)
}

# Read script arguments
while getopts ":s:r:" option; do
    case ${option} in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

getCosmosDbUrl
getAppInsightKey
getBatchAccountEndpoint

echo -e "
Copy below output into .env file
START of .env file >>> \033[32m

SUBSCRIPTION=${subscription}
RESOURCE_GROUP=${resourceGroupName}

AZ_BATCH_ACCOUNT_NAME=${batchAccountName}
AZ_BATCH_ACCOUNT_URL=https://${batchAccountEndpoint}/
AI_STORAGE_SCAN_QUEUE=ondemand-scanrequest
AI_STORAGE_PRIVACY_SCAN_QUEUE=privacy-scan-request
AI_KEY_VAULT_URL=https://${keyVault}.vault.azure.net/
APPLICATIONINSIGHTS_CONNECTION_STRING=${appInsightsConnectionString}
AZURE_STORAGE_NAME=${storageAccountName}

AZ_BATCH_POOL_ID=
AZ_BATCH_JOB_ID=1-dev-test-job
AZ_BATCH_TASK_ID=dev-test-task

WEB_API_BASE_URL=

URL=
ID=
DEEP_SCAN=
SCANGROUPID=
TARGETREPORT=

HEADLESS=
DEV_TOOLS=
AZ_CLI_AUTH=
PAGE_AUTH=
NETWORK_TRACE=
USER_AGENT=
X_FORWARDED_FOR_HTTP_HEADER=
AZURE_AUTH_CLIENT_NAME=
AZURE_AUTH_CLIENT_PASSWORD=

\033[0m <<< END of .env file

Copy below output into Azure Function local.settings.json configuration file.
START of local.settings.json file >>> \033[32m

{
    \"IsEncrypted\": false,
    \"Values\": {
        \"FUNCTIONS_WORKER_RUNTIME\": \"node\",
        \"AzureWebJobsStorage__accountName\": \"${storageAccountName}\",
        \"AzureWebJobsStorage__clientId\": \"${vmManagedIdentityClientID}\",
        \"COSMOS_CONNECTION__accountEndpoint\": \"${cosmosDbUrl}\"
    }
}

\033[0m <<< END of local.settings.json file
"
