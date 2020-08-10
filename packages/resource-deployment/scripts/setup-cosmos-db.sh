#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

export cosmosAccountName
export resourceGroupName

createCosmosAccount() {
    echo "[setup-cosmos-db] Creating Cosmos DB account..."
    resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "${0%/*}/../templates/cosmos-db.template.json" --parameters "${0%/*}/../templates/cosmos-db.parameters.json" --query "properties.outputResources[].id" -o tsv)

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

    if az cosmosdb sql container show --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "[setup-cosmos-db] Collection '$collectionName' already exists"
        echo "[setup-cosmos-db] Updating throughput for collection '$collectionName'"
        az cosmosdb sql container throughput update \
            --account-name $cosmosAccountName \
            --database-name $dbName \
            --name "$collectionName" \
            --resource-group $resourceGroupName \
            --throughput $throughput \
            1>/dev/null
    else
        echo "[setup-cosmos-db] Creating DB collection '$collectionName'"
        az cosmosdb sql container create --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --partition-key-path "/partitionKey" --throughput "$throughput" --ttl "$ttl" 1>/dev/null
        echo "Successfully created DB collection '$collectionName'"
    fi

}

createCosmosDatabase() {
    local dbName=$1

    echo "[setup-cosmos-db] Checking if database '$dbName' exists in Cosmos account '$cosmosAccountName' in resource group '$resourceGroupName'"

    if az cosmosdb sql database show --name "$dbName" --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "[setup-cosmos-db] Database '$dbName' already exists"
    else
        echo "[setup-cosmos-db] Creating Cosmos DB '$dbName'"
        az cosmosdb sql database create --name "$dbName" --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" 1>/dev/null
        echo "[setup-cosmos-db] Successfully created Cosmos DB '$dbName'"
    fi
}

function setupCosmos() {
    createCosmosAccount

    local onDemandScannerDbName="onDemandScanner"

    local cosmosSetupProcesses=(
        "createCosmosDatabase \"$onDemandScannerDbName\""
    )
    echo "Creating Cosmos databases in parallel"
    runCommandsWithoutSecretsInParallel cosmosSetupProcesses

    # Increase throughput for below collection only in case of prod
    # Refer to https://docs.microsoft.com/en-us/azure/cosmos-db/time-to-live for item TTL scenarios
    if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
        cosmosSetupProcesses=(
            "createCosmosCollection \"scanRuns\" \"$onDemandScannerDbName\" \"2592000\" \"20000\""        # 30 days
            "createCosmosCollection \"scanBatchRequests\" \"$onDemandScannerDbName\" \"604800\" \"2000\"" # 7 days
            "createCosmosCollection \"scanRequests\" \"$onDemandScannerDbName\" \"604800\" \"10000\""     # 7 days
            "createCosmosCollection \"systemData\" \"$onDemandScannerDbName\" \"-1\" \"400\""
        )
    else
        cosmosSetupProcesses=(
            "createCosmosCollection \"scanRuns\" \"$onDemandScannerDbName\" \"2592000\" \"400\""         # 30 days
            "createCosmosCollection \"scanBatchRequests\" \"$onDemandScannerDbName\" \"604800\" \"400\"" # 7 days
            "createCosmosCollection \"scanRequests\" \"$onDemandScannerDbName\" \"604800\" \"400\""      # 7 days
            "createCosmosCollection \"systemData\" \"$onDemandScannerDbName\" \"-1\" \"400\""
        )
    fi

    echo "Creating Cosmos collections in parallel"
    runCommandsWithoutSecretsInParallel cosmosSetupProcesses

    echo "Successfully setup Cosmos account."
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

. "${0%/*}/process-utilities.sh"

setupCosmos
