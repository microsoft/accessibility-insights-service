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

# Function runs in a separate shell to keep trap handler apart
pushSecretsToKeyVault() (
    echo "Pushing secrets to keyvault ${keyVault} in resourceGroup ${resourceGroupName}"
    getCurrentUserDetails

    trap 'onExit-push-secrets-to-key-vault' EXIT
    grantWritePermissionToKeyVault

    cosmosDbUrl=$(az cosmosdb show --name "${cosmosAccountName}" --resource-group "${resourceGroupName}" --query "documentEndpoint" -o tsv)
    pushSecretToKeyVault "cosmosDbUrl" "${cosmosDbUrl}"

    pushSecretToKeyVault "storageAccountName" "${storageAccountName}"

    webApiIdentityClientId=$(az identity show --name "${webApiManagedIdentityName}" --resource-group "${resourceGroupName}" --query clientId -o tsv)
    pushSecretToKeyVault "webApiIdentityClientId" "${webApiIdentityClientId}"

    appInsightsConnectionString=$(az monitor app-insights component show --app "$appInsightsName" --resource-group "$resourceGroupName" --query "connectionString" -o tsv)
    pushSecretToKeyVault "appInsightsConnectionString" "${appInsightsConnectionString}"

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
