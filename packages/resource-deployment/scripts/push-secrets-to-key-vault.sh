#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export keyVault
export resourceGroupName
export storageAccountName
export cosmosAccountName
export cosmosDbUrl
export cosmosAccessKey

export loggedInUserType
export loggedInServicePrincipalName

exitWithUsageInfo() {
    echo "
Usage: $0 -c <cosmos account name> -r <resource group> -s <storage account name> -k <key vault name>
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

revokePermissionsToKeyVault() {

    echo "Revoking permission to key vault $keyVault for logged in user"

    if [[ $loggedInUserType == "user" ]]; then
        echo "Revoking keyvault permission for user account"
        az keyvault delete-policy --name "$keyVault" --upn "$loggedInServicePrincipalName" 1>/dev/null
    else
        echo "Revoking keyvault permission for service principal"
        az keyvault delete-policy --name "$keyVault" --spn "$loggedInServicePrincipalName" 1>/dev/null
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

getCosmosAccessKey() {

    cosmosAccessKey=$(az cosmosdb list-keys --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "primaryMasterKey" -o tsv)

    if [[ -z $cosmosAccessKey ]]; then
        echo "Unable to get accessKey for cosmos db account $cosmosAccountName under resource group $resourceGroupName"
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

# Read script arguments
while getopts "c:r:s:k:" option; do
    case $option in
    c) cosmosAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    s) storageAccountName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $cosmosAccountName ]] || [[ -z $resourceGroupName ]] || [[ -z $storageAccountName ]] || [[ -z $keyVault ]]; then
    echo "$cosmosAccountName $resourceGroupName $storageAccountName $keyVault"

    exitWithUsageInfo
fi

echo "Pushing secrets to keyvault $keyVault in resourceGroup $resourceGroupName"

getLoggedInUserDetails

trap 'revokePermissionsToKeyVault' EXIT
grantWritePermissionToKeyVault

getCosmosDbUrl
pushSecretToKeyVault "cosmosDbUrl" "$cosmosDbUrl"

getCosmosAccessKey
pushSecretToKeyVault "cosmosDbKey" "$cosmosAccessKey"

pushSecretToKeyVault "storageAccountName" "$storageAccountName"

getStorageAccessKey
pushSecretToKeyVault "storageAccountKey" "$storageAccountKey"
