#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

export cosmosAccountName
export resourceGroupName

createCosmosAccount() {
    echo "Creating Cosmos DB account..."
    resources=$(az deployment group create --resource-group "$resourceGroupName" --template-file "${0%/*}/../templates/cosmos-db.template.json" --parameters "${0%/*}/../templates/cosmos-db.parameters.json" --query "properties.outputResources[].id" -o tsv)

    export resourceName
    . "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.DocumentDB/databaseAccounts" -r "$resources"
    cosmosAccountName="$resourceName"

    echo "Successfully created Cosmos DB account '$cosmosAccountName'"
}

createCosmosCollection() {
    local collectionName=$1
    local dbName=$2
    local ttl=$3
    local throughput=$4

    if [[ -z $ttl ]]; then
        ttl=-1
    fi

    echo "Checking if collection '$collectionName' exists in database '$dbName' of account '$cosmosAccountName' in resource group '$resourceGroupName'"

    if az cosmosdb sql container show --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "Collection '$collectionName' already exists"

        if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
            # configure autoscale throughput for production environment
            autoscale=$(az cosmosdb sql container throughput show --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --query "resource.autoscaleSettings.maxThroughput" -o tsv)
            if [[ -n $autoscale ]]; then
                echo "Autoscale throughput for collection '$collectionName' already enabled"
                echo "Updating autoscale maximum throughput for collection '$collectionName'"
                az cosmosdb sql container throughput update --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --max-throughput "$throughput" 1>/dev/null
            else
                echo "Autoscale throughput for collection '$collectionName' is not enabled"
                echo "Migrating collection '$collectionName' throughput to autoscale provision"
                az cosmosdb sql container throughput migrate --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --throughput-type "autoscale" 1>/dev/null

                echo "Updating autoscale maximum throughput for collection '$collectionName'"
                az cosmosdb sql container throughput update --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --max-throughput "$throughput" 1>/dev/null
            fi
        else
            # configure fixed throughput for dev environment
            echo "Updating fixed throughput for collection '$collectionName'"
            az cosmosdb sql container throughput update --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --throughput "$throughput" 1>/dev/null
        fi

        echo "Successfully updated collection '$collectionName'"
    else
        echo "Collection '$collectionName' does not exist"

        if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
            # create autoscale throughput collection for production environment
            echo "Creating autoscale throughput collection '$collectionName'"
            az cosmosdb sql container create --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --partition-key-path "/partitionKey" --max-throughput "$throughput" --ttl "$ttl" 1>/dev/null
        else
            # create fixed throughput collection for dev environment
            echo "Creating fixed throughput collection '$collectionName'"
            az cosmosdb sql container create --account-name "$cosmosAccountName" --database-name "$dbName" --name "$collectionName" --resource-group "$resourceGroupName" --partition-key-path "/partitionKey" --throughput "$throughput" --ttl "$ttl" 1>/dev/null
        fi

        echo "Successfully created collection '$collectionName'"
    fi
}

createCosmosDatabase() {
    local dbName=$1

    echo "Checking if database '$dbName' exists in Cosmos account '$cosmosAccountName' in resource group '$resourceGroupName'"

    if az cosmosdb sql database show --name "$dbName" --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" --query "id" 2>/dev/null; then
        echo "Database '$dbName' already exists"
    else
        echo "Creating Cosmos DB '$dbName'"
        az cosmosdb sql database create --name "$dbName" --account-name "$cosmosAccountName" --resource-group "$resourceGroupName" 1>/dev/null
        echo "Successfully created Cosmos DB '$dbName'"
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

    # Increase autoscale maximum throughput for below collection only in case of prod
    # Refer to https://docs.microsoft.com/en-us/azure/cosmos-db/time-to-live for item TTL scenarios
    if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
        cosmosSetupProcesses=(
            "createCosmosCollection \"scanRuns\" \"$onDemandScannerDbName\" \"2592000\" \"40000\""        # 30 days
            "createCosmosCollection \"scanBatchRequests\" \"$onDemandScannerDbName\" \"604800\" \"4000\"" # 7 days
            "createCosmosCollection \"scanRequests\" \"$onDemandScannerDbName\" \"604800\" \"20000\""     # 7 days
            "createCosmosCollection \"systemData\" \"$onDemandScannerDbName\" \"-1\" \"4000\""
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
    echo "Usage: $0 -r <resource group> -e <environment>"
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
