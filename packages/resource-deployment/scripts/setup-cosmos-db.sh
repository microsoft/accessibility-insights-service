#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

export cosmosAccountName
export resourceGroupName

createCosmosAccount() {
    echo "[setup-cosmos-db] Creating Cosmos DB account..."
    resources=$(az group deployment create --resource-group "$resourceGroupName" --template-file "${0%/*}/../templates/cosmos-db.template.json" --parameters "${0%/*}/../templates/cosmos-db.parameters.json" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.DocumentDB/databaseAccounts" -r "$resources"
    cosmosAccountName="$resourceName"

    echo "[setup-cosmos-db] Successfully created Cosmos DB account '$cosmosAccountName'"
}

createCosmosCollection() {
    local collectionName=$1
    local dbName=$2
    local ttl=$3
    local throughput=$4

    if [[ -z $ttl ]]; then
        ttl=-1
    fi

    echo "[setup-cosmos-db] Checking if collection '$collectionName' exists in db '$dbName' of cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    collectionExists=$(az cosmosdb collection exists --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$collectionExists" = true ]; then
        echo "[setup-cosmos-db] Collection '$collectionName' already exists"
    else
        echo "[setup-cosmos-db] Creating DB collection '$collectionName'"
        az cosmosdb collection create --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" --partition-key-path "/partitionKey" --throughput "$throughput" --default-ttl "$ttl" 1>/dev/null
        echo "Successfully created DB collection '$collectionName'"
    fi
}

createCosmosDatabase() {
    local dbName=$1

    echo "[setup-cosmos-db] Checking if database '$dbName' exists in Cosmos account '$cosmosAccountName' in resource group '$resourceGroupName'"
    databaseExists=$(az cosmosdb database exists --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ "$databaseExists" = true ]; then
        echo "[setup-cosmos-db] Database '$dbName' already exists"
    else
        echo "[setup-cosmos-db] Creating Cosmos DB '$dbName'"
        az cosmosdb database create --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" 1>/dev/null
        echo "[setup-cosmos-db] Successfully created Cosmos DB '$dbName'"
    fi
}

exitWithUsageInfo() {
    echo "
Usage: $0 \
-r <resource group> \
-e <environment>
"
    exit 1
}

# Read script arguments
while getopts ":r:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [ -z $resourceGroupName ] || [ -z $environment ]; then
    exitWithUsageInfo
fi

createCosmosAccount

scannerDbName="scanner"
onDemandScannerDbName="onDemandScanner"

createCosmosDatabase "$scannerDbName"
createCosmosDatabase "$onDemandScannerDbName"

# Increase throughput for below collection only in case of prod
# Refer to https://docs.microsoft.com/en-us/azure/cosmos-db/time-to-live for item TTL scenarios
if [ $environment = "prod" ]; then
    createCosmosCollection "a11yIssues" "$scannerDbName" "-1" "25000"
    createCosmosCollection "scanRuns" "$onDemandScannerDbName" "2592000" "20000"        # 30 days
    createCosmosCollection "scanBatchRequests" "$onDemandScannerDbName" "604800" "2000" # 7 days
    createCosmosCollection "scanRequests" "$onDemandScannerDbName" "604800" "20000"     # 7 days
    createCosmosCollection "systemData" "$onDemandScannerDbName" "1440" "2000"          # 1 day
else
    createCosmosCollection "a11yIssues" "$scannerDbName" "-1" "2000"
    createCosmosCollection "scanRuns" "$onDemandScannerDbName" "2592000" "2000"         # 30 days
    createCosmosCollection "scanBatchRequests" "$onDemandScannerDbName" "604800" "2000" # 7 days
    createCosmosCollection "scanRequests" "$onDemandScannerDbName" "604800" "2000"      # 7 days
    createCosmosCollection "systemData" "$onDemandScannerDbName" "1440" "2000"          # 1 day
fi
