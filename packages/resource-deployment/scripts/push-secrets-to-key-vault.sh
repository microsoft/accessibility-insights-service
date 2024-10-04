#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

export keyVault
export resourceGroupName
export storageAccountName
export cosmosAccountName
export cosmosDbUrl
export containerRegistryName
export principalName

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -c <web API client ID>
"
    exit 1
}

getCurrentUserDetails() {
    echo "Getting logged in user name"
    principalName=$(az account show --query "user.name" -o tsv)

    if [[ -z ${principalName} ]]; then
        echo "Unable to get logged in user name"
        exit 1
    fi
}

grantWritePermissionToKeyVault() {
    echo "Adding key vault role assignment for logged in user"
    az role assignment create \
        --role "Key Vault Secrets Officer" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVault}" 1>/dev/null
}

onExit-push-secrets-to-key-vault() {
    echo "Revoking key vault role assignment for logged in user"
    az role assignment delete \
        --role "Key Vault Secrets Officer" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVault}" >/dev/null 2>&1
}

pushSecretToKeyVault() {
    local secretName=$1
    local secretValue=$2

    echo "Adding ${secretName} key vault secret"
    az keyvault secret set --vault-name "${keyVault}" --name "${secretName}" --value "${secretValue}" 1>/dev/null
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "documentEndpoint" -o tsv)

    if [[ -z ${cosmosDbUrl} ]]; then
        echo "Unable to get Cosmos DB URL for account ${cosmosAccountName} under resource group ${resourceGroupName}"
        exit 1
    fi
}

createAppInsightsApiKey() {
    apiKeyParams="--app $appInsightsName --resource-group $resourceGroupName --api-key $appInsightsName-api-key"
    apiKeyExists=$(az monitor app-insights api-key show $apiKeyParams)

    # If api key already exists, delete and recreate it
    if [[ -n "${apiKeyExists}" ]]; then
        echo "Deleting existing App Insights API key"
        az monitor app-insights api-key delete $apiKeyParams --yes 1>/dev/null
    fi

    appInsightsApiKey=$(az monitor app-insights api-key create $apiKeyParams --read-properties ReadTelemetry --query "apiKey" -o tsv)
    echo "App Insights API key was created ${appInsightsApiKey}"
}

# Function runs in a separate shell to keep trap handler apart
pushSecretsToKeyVault() (
    echo "Pushing secrets to keyvault ${keyVault} in resourceGroup ${resourceGroupName}"
    getCurrentUserDetails

    trap 'onExit-push-secrets-to-key-vault' EXIT
    grantWritePermissionToKeyVault

    getCosmosDbUrl
    pushSecretToKeyVault "cosmosDbUrl" "${cosmosDbUrl}"

    pushSecretToKeyVault "storageAccountName" "${storageAccountName}"

    webApiIdentityClientId=$(az identity show --name "${webApiManagedIdentityName}" --resource-group "${resourceGroupName}" --query clientId -o tsv)
    pushSecretToKeyVault "webApiIdentityClientId" "${webApiIdentityClientId}"

    # createAppInsightsApiKey
    # pushSecretToKeyVault "appInsightsApiKey" "${appInsightsApiKey}"

    pushSecretToKeyVault "containerRegistryName" "${containerRegistryName}"
)

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

pushSecretsToKeyVault
