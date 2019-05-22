#!/bin/bash
set -eo pipefail

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -c <cosmos account name> -r <resource group> -s <storage account name> -k <key vault name>
"
    exit 1
}

getLoggedInUserObjectId() {
    echo "getting logged in user's object id"

    loggedInUserObjectId=$(az ad signed-in-user show --query "objectId" -o tsv)
    if [[ -z $loggedInUserObjectId ]]; then
        echo "unable to get logged in user's object id"
        exit 1
    fi
}

grantWritePermissionToKeyVault() {
    keyVaultName=$1
    objectId=$2

    echo "granting write permission to key vault $keyVaultName for logged in user"

    az keyvault set-policy --name "$keyVaultName" --object-id "$objectId" --secret-permissions set 1>/dev/null
}

revokePermissionsToKeyVault() {
    keyVaultName=$1
    objectId=$2

    echo "revoking permission to key vault $keyVaultName for logged in user"
    az keyvault delete-policy --name "$keyVaultName" --object-id "$objectId" 1>/dev/null
}

pushSecretToKeyVault() {
    keyVaultName=$1
    secretName=$2
    secretValue=$3

    echo "adding secret for $secretName in key vault $keyVaultName"
    az keyvault secret set --vault-name "$keyVaultName" --name "$secretName" --value "$secretValue" 1>/dev/null
}

getCosmosDbUrl() {
    cosmosAccountName=$1
    resourceGroupName=$2

    cosmosDbUrl=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "documentEndpoint" -o tsv)

    if [[ -z $cosmosDbUrl ]]; then
        echo "unable to get cosmos db url for cosmos account $cosmosAccountName under resource group $resourceGroupName"
        exit 1
    fi
}

getCosmosAccessKey() {
    cosmosAccountName=$1
    resourceGroupName=$2

    cosmosAccessKey=$(az cosmosdb list-keys --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "primaryMasterKey" -o tsv)

    if [[ -z $cosmosAccessKey ]]; then
        echo "unable to get accessKey for cosmos db account $cosmosAccountName under resource group $resourceGroupName"
        exit 1
    fi
}

getStorageAccessKey() {
    storageAccountName=$1

    storageAccountKey=$(az storage account keys list --account-name "$storageAccountName" --query "[0].value" -o tsv)

    if [[ -z $storageAccountKey ]]; then
        echo "unable to get accessKey for storage account $storageAccountName"
        exit 1
    fi
}

# Read script arguments
while getopts "c:r:s:k:" option; do
    case $option in
    c) cosmosAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    s) storageAccountName=${OPTARG} ;;
    k) keyVaultName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $cosmosAccountName ]] || [[ -z $resourceGroupName ]] || [[ -z $storageAccountName ]] || [[ -z $keyVaultName ]]; then
    exitWithUsageInfo
fi

loggedInUserObjectId=""
getLoggedInUserObjectId

trap 'revokePermissionsToKeyVault "$keyVaultName" "$loggedInUserObjectId"' EXIT

grantWritePermissionToKeyVault "$keyVaultName" "$loggedInUserObjectId"

cosmosDbUrl=""
getCosmosDbUrl "$cosmosAccountName" "$resourceGroupName"
pushSecretToKeyVault "$keyVaultName" "cosmosDbUrl" "$cosmosDbUrl"

cosmosAccessKey=""
getCosmosAccessKey "$cosmosAccountName" "$resourceGroupName"
pushSecretToKeyVault "$keyVaultName" "cosmosDbKey" "$cosmosAccessKey"

pushSecretToKeyVault "$keyVaultName" "storageAccountName" "$storageAccountName"

storageAccountKey=""
getStorageAccessKey "$storageAccountName"
pushSecretToKeyVault "$keyVaultName" "storageAccountKey" "$storageAccountKey"
