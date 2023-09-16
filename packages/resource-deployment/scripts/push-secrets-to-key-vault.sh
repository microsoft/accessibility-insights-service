#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export keyVault
export resourceGroupName
export storageAccountName
export cosmosAccountName
export cosmosDbUrl
export containerRegistryName

export loggedInUserType
export loggedInServicePrincipalName
export tenantId

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -c <web API AAD client Id> -p <web API AAD client secret>
"
    exit 1
}

getLoggedInUserDetails() {
    echo "Getting logged in service principal id"

    loggedInUserType=$(az account show --query "user.type" -o tsv)
    loggedInServicePrincipalName=$(az account show --query "user.name" -o tsv)

    echo "Logged in user account type - $loggedInUserType"
    if [[ -z $loggedInServicePrincipalName ]]; then
        echo "Unable to get logged in user service principal id"
        exit 1
    fi
}

getTenantId() {
    tenantId=$(az account show --query "tenantId" -o tsv)
}

grantWritePermissionToKeyVault() {
    echo "Granting write permission to key vault $keyVault for logged in user"

    if [[ $loggedInUserType == "user" ]]; then
        echo "Setting write policy for user account"
        az keyvault set-policy --name "$keyVault" --upn "$loggedInServicePrincipalName" --secret-permissions set 1>/dev/null
    else
        echo "Setting write policy for service principal"
        az keyvault set-policy --name "$keyVault" --spn "$loggedInServicePrincipalName" --secret-permissions set 1>/dev/null
    fi
}

onExit-push-secrets-to-key-vault() {
    echo "Revoking permission to key vault $keyVault for logged in user"

    if [[ $loggedInUserType == "user" ]]; then
        echo "Revoking keyvault permission for user account"
        az keyvault delete-policy --name "$keyVault" --upn "$loggedInServicePrincipalName" 1>/dev/null || true
    else
        echo "Revoking keyvault permission for service principal"
        az keyvault delete-policy --name "$keyVault" --spn "$loggedInServicePrincipalName" 1>/dev/null || true
    fi
}

pushSecretToKeyVault() {
    local secretName=$1
    local secretValue=$2

    echo "Adding secret for $secretName in key vault $keyVault"
    az keyvault secret set --vault-name "$keyVault" --name "$secretName" --value "$secretValue" 1>/dev/null
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "documentEndpoint" -o tsv)

    if [[ -z $cosmosDbUrl ]]; then
        echo "Unable to get cosmos db url for cosmos account $cosmosAccountName under resource group $resourceGroupName"
        exit 1
    fi
}

getStorageAccessKey() {
    storageAccountKey=$(az storage account keys list --account-name "$storageAccountName" --query "[0].value" -o tsv)

    if [[ -z $storageAccountKey ]]; then
        echo "Unable to get accessKey for storage account $storageAccountName"
        exit 1
    fi
}

getContainerRegistryLogin() {
    containerRegistryUsername=$(az acr credential show --name "$containerRegistryName" --query "username" -o tsv)
    containerRegistryPassword=$(az acr credential show --name "$containerRegistryName" --query "passwords[0].value" -o tsv)

    if [[ -z $containerRegistryUsername ]] || [[ -z $containerRegistryPassword ]]; then
        echo "Unable to get login for container registry $containerRegistryName"
        exit 1
    fi
}

createAppInsightsApiKey() {
    apiKeyParams="--app $appInsightsName --resource-group $resourceGroupName --api-key $appInsightsName-api-key"

    apiKeyExists=$(az monitor app-insights api-key show $apiKeyParams)

    # If api key already exists, delete and recreate it
    if [[ -n "$apiKeyExists" ]]; then
        echo "Deleting existing app insights API key"
        az monitor app-insights api-key delete $apiKeyParams --yes 1>/dev/null
    fi

    appInsightsApiKey=$(az monitor app-insights api-key create $apiKeyParams --read-properties ReadTelemetry --query "apiKey" -o tsv)
    echo "App Insights API key created '$appInsightsApiKey'"
}

# function runs in a subshell to isolate trap handler
pushSecretsToKeyVault() (
    echo "Pushing secrets to keyvault $keyVault in resourceGroup $resourceGroupName"

    getLoggedInUserDetails

    trap 'onExit-push-secrets-to-key-vault' EXIT
    grantWritePermissionToKeyVault

    getCosmosDbUrl
    pushSecretToKeyVault "cosmosDbUrl" "$cosmosDbUrl"

    pushSecretToKeyVault "storageAccountName" "$storageAccountName"

    getStorageAccessKey
    pushSecretToKeyVault "storageAccountKey" "$storageAccountKey"

    pushSecretToKeyVault "restApiSpAppId" "$webApiAdClientId"
    pushSecretToKeyVault "restApiSpSecret" "$webApiAdClientSecret"
    getTenantId
    pushSecretToKeyVault "authorityUrl" "https://login.microsoftonline.com/${tenantId}"

    createAppInsightsApiKey
    pushSecretToKeyVault "appInsightsApiKey" "$appInsightsApiKey"

    getContainerRegistryLogin
    pushSecretToKeyVault "containerRegistryUsername" "$containerRegistryUsername"
    pushSecretToKeyVault "containerRegistryPassword" "$containerRegistryPassword"

)

# Read script arguments
while getopts ":r:c:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    p) webApiAdClientSecret=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]]; then
    exitWithUsageInfo
fi

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

. "${0%/*}/get-resource-names.sh"

pushSecretsToKeyVault
