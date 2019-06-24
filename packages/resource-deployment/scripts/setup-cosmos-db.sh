#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

export cosmosAccountName
export resourceGroupName

createCosmosAccount() {
    echo "Creating Cosmos DB account $cosmosAccountName"
    resources=$(az group deployment create --resource-group "$resourceGroupName" --template-file "${0%/*}/../templates/cosmos-db.template.json" --parameters "${0%/*}/../templates/cosmos-db.parameters.json" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.DocumentDB/databaseAccounts" -r "$resources"
    cosmosAccountName="$resourceName"

    echo "Successfully created Cosmos DB account $cosmosAccountName"
}

createCosmosCollection() {
    local collectionName=$1
    local dbName=$2

    echo "Checking if collection '$collectionName' exists in db '$dbName' of cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    collectionExists=$(az cosmosdb collection exists --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$collectionExists" = true ]; then
        echo "Collection '$collectionName' already exists"
    else
        echo "Creating DB collection '$collectionName'"
        az cosmosdb collection create --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" --partition-key-path "/partitionKey" --throughput 100000 1>/dev/null
        echo "Successfully created DB collection '$collectionName'"
    fi
}

createCosmosDatabase() {
    local dbName=$1

    echo "Checking if database '$dbName' exists in Cosmos account '$cosmosAccountName' in resource group '$resourceGroupName'"
    databaseExists=$(az cosmosdb database exists --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$databaseExists" = true ]; then
        echo "Database $dbName already exists"
    else
        echo "Creating Cosmos DB $dbName"
        az cosmosdb database create --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" 1>/dev/null
        echo "Successfully created Cosmos DB $dbName"
    fi
}

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts "r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

cosmosAccountName=""
createCosmosAccount

dbName="scanner"
createCosmosDatabase "$dbName"
createCosmosCollection "a11yIssues" "$dbName"
createCosmosCollection "webPagesToScan" "$dbName"
