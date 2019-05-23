#!/bin/bash
set -eo pipefail

export keyVault
export resourceGroupName
export storageAccountName
export cosmosAccountName
export cosmosDbUrl
export cosmosAccessKey

exitWithUsageInfo() {
    echo "
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
    local objectId=$1

    echo "granting write permission to key vault $keyVault for logged in user for $objectId"

    az keyvault set-policy --name "$keyVault" --object-id "$objectId" --secret-permissions set 1>/dev/null
}

revokePermissionsToKeyVault() {
    local objectId=$1

    echo "revoking permission to key vault $keyVault for logged in user"
    az keyvault delete-policy --name "$keyVault" --object-id "$objectId" 1>/dev/null
}

pushSecretToKeyVault() {
    local secretName=$1
    local secretValue=$2

    echo "adding secret for $secretName in key vault $keyVault"
    az keyvault secret set --vault-name "$keyVault" --name "$secretName" --value "$secretValue" 1>/dev/null
}

getCosmosDbUrl() {
    cosmosDbUrl=$(az cosmosdb show --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "documentEndpoint" -o tsv)

    if [[ -z $cosmosDbUrl ]]; then
        echo "unable to get cosmos db url for cosmos account $cosmosAccountName under resource group $resourceGroupName"
        exit 1
    fi
}

getCosmosAccessKey() {

    cosmosAccessKey=$(az cosmosdb list-keys --name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "primaryMasterKey" -o tsv)

    if [[ -z $cosmosAccessKey ]]; then
        echo "unable to get accessKey for cosmos db account $cosmosAccountName under resource group $resourceGroupName"
        exit 1
    fi
}

getStorageAccessKey() {
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

getLoggedInUserObjectId

trap 'revokePermissionsToKeyVault "$loggedInUserObjectId"' EXIT
grantWritePermissionToKeyVault "$loggedInUserObjectId"

getCosmosDbUrl
pushSecretToKeyVault "cosmosDbUrl" "$cosmosDbUrl"

getCosmosAccessKey
pushSecretToKeyVault "cosmosDbKey" "$cosmosAccessKey"

pushSecretToKeyVault "storageAccountName" "$storageAccountName"

getStorageAccessKey
pushSecretToKeyVault "storageAccountKey" "$storageAccountKey"
