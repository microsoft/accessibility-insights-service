#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will clear all pending scans from cosmos and storage
# in case an outage has created a long backlog. This is for development
# and testing purposes only.

export resourceGroupName
export cosmosAccountName
export storageAccountName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

dbName="onDemandScanner"

function clearRequestQueues() {
    local queueName=$1

    az storage message clear --account-name "$storageAccountName" --queue-name "$queueName" 1>/dev/null
    echo "Queue $queueName was successfully cleared."
}

function clearCosmosContainer() {
    local cosmosContainerName=$1

    local ttl=$(
        az cosmosdb sql container show \
            --account-name "$cosmosAccountName" \
            --database-name "$dbName" \
            --name "$cosmosContainerName" \
            --resource-group "$resourceGroupName" \
            --query "resource.defaultTtl" -o tsv
    )
    local throughput=$(
        az cosmosdb sql container throughput show \
            --account-name "$cosmosAccountName" \
            --database-name "$dbName" \
            --name "$cosmosContainerName" \
            --resource-group "$resourceGroupName" \
            --query "resource.maxThroughput" -o tsv
    )

    echo "Deleting cosmos container $cosmosContainerName in database $dbName..."
    az cosmosdb sql container delete \
        --account-name "$cosmosAccountName" \
        --database-name "$dbName" \
        --name "$cosmosContainerName" \
        --resource-group "$resourceGroupName" \
        --yes 1>/dev/null

    echo "Recreating cosmos container $cosmosContainerName in database $dbName..."
    az cosmosdb sql container create \
        --account-name "$cosmosAccountName" \
        --database-name "$dbName" \
        --name "$cosmosContainerName" \
        --resource-group "$resourceGroupName" \
        --partition-key-path "/partitionKey" \
        --max-throughput "$throughput" \
        --ttl "$ttl" 1>/dev/null

    echo "Container $cosmosContainerName was successfully cleared."
}

function clearScanBacklog() {
    clearContainerProcesses=(
        "clearCosmosContainer \"scanBatchRequests\""
        "clearCosmosContainer \"scanRequests\""
        "clearRequestQueues \"ondemand-scanrequest\""
        "clearRequestQueues \"privacy-scan-request\""
        "clearRequestQueues \"ondemand-send-notification\""
    )

    runCommandsWithoutSecretsInParallel clearContainerProcesses
}

# Read script arguments
while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

echo "This script will delete all pending, accepted, and queued scans in resource group $resourceGroupName. Do NOT run this script on production systems."
read -p "Proceed with deleting in-progress scans? (y/n)" -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    clearScanBacklog
    echo "Finished clearing scan backlog."
else
    echo "Scan backlog will not be cleared."
fi
