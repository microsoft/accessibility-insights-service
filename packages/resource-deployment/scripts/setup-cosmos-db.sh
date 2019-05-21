#!/bin/bash
set -eo pipefail

createCosmosCollection() {
    collectionName=$1
    dbName=$2
    cosmosAccountName=$3
    resourceGroupName=$4

    echo "Checking if collection '$collectionName' exists in db '$dbName' of cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    collectionExists=$(az cosmosdb collection exists --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$collectionExists" = true ]; then
        echo "Collection '$collectionName' already exists"
    else
        az cosmosdb collection create --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" --partition-key-path "/partitionKey" --throughput 10000
        echo "Successfully created collection '$collectionName'"
    fi
}

createCosmosDatabase() {
    dbName=$1
    cosmosAccountName=$2
    resourceGroupName=$3

    echo "Checking if database '$dbName' exists in cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    databaseExists=$(az cosmosdb database exists --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$databaseExists" = true ]; then
        echo "Database $dbName already exists"
    else
        az cosmosdb database create --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName"
        echo "Successfully created database $dbName"
    fi
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -c <cosmosAccountName> -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts "a:r:" option; do
    case $option in
    a) cosmosAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $cosmosAccountName ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

dbName="scanner2"
createCosmosDatabase "$dbName" "$cosmosAccountName" "$resourceGroupName"
createCosmosCollection "a11yIssues" "$dbName" "$cosmosAccountName" "$resourceGroupName"
createCosmosCollection "webPagesToScan" "$dbName" "$cosmosAccountName" "$resourceGroupName"
