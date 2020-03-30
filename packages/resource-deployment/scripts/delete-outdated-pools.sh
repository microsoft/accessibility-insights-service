#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

exitWithUsageInfo() {
    echo "
Usage: $0 -b <batch account name> -p <parameter file path> [-t <delete timeout>]
"
    exit 1
}

deletePool() {
    poolId=$1

    echo "deleting pool $poolId"
    az batch pool delete --account-name $batchAccountName --pool-id $poolId --yes
    echo "done"

    waitForDelete
}

waitForDelete() {
    poolId=$1

    checkIfPoolExists $poolId
    waiting=false
    end=$((SECONDS + $deleteTimeout))
    while [ "$poolExists" == "true" ] && [ $SECONDS -le $end ]; do
        if [ "$waiting" != true ]; then
            waiting=true
            echo "Waiting for $poolId to delete"
            printf " - Running .."
        fi

        sleep 5
        printf "."
        checkIfPoolExists
    done
}

checkIfPoolExists() {
    poolId=$1

    poolExists=$(az batch pool list --account-name "$batchAccountName" --query "[?id=='$poolId']" -o tsv)
    if [[ -z $poolExists ]]; then
        poolExists=false
    else
        poolExists=true
    fi
}

compareConfigFileToDeployedConfig() {
    poolId=$1
    batchConfigPropertyName=$2
    templateFileParameterName=$3

    query="[?id=='$poolId'].$batchConfigPropertyName"

    expectedValue=$(cat $parameterFilePath | jq -r ".parameters.$templateFileParameterName.value")
    actualValue=$(az batch pool list --account-name "$batchAccountName" --query "$query" -o tsv)

    if [ "$expectedValue" != "$actualValue" ]; then
        echo "$batchConfigPropertyName for $poolId must be updated from $actualValue to $expectedValue."
        shouldDeletePool=true
    fi
}

deletePoolIfOutdated() {
    poolId=$1
    poolPropertyNamePrefix=$2

    shouldDeletePool=false

    checkIfPoolExists $poolId
    if [ "$poolExists" == "false" ]; then
        echo "Pool $poolId not yet created."
        return
    fi

    compareConfigFileToDeployedConfig $poolId "vmSize" "${poolPropertyNamePrefix}VmSize"
    if [ $shouldDeletePool == "true" ]; then
        deletePool $poolId
        return
    fi

    compareConfigFileToDeployedConfig $poolId "maxTasksPerNode" "${poolPropertyNamePrefix}MaxTasksPerNode"
    if [ $shouldDeletePool == "true" ]; then
        deletePool $poolId
        return
    fi

    echo "$poolId does not need to be recreated."
}

# Read script arguments
while getopts ":b:p:t:" option; do
    case $option in
    b) batchAccountName=${OPTARG} ;;
    p) parameterFilePath=${OPTARG} ;;
    t) deleteTimeout=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $batchAccountName ]] || [[ -z $parameterFilePath ]]; then
    exitWithUsageInfo
fi

if [[ -z $deleteTimeout ]]; then
    deleteTimeout=600
fi

batchAccountExists=$(az resource list --name $batchAccountName -o tsv)
if [[ -z "$batchAccountExists" ]]; then
    echo "batch account $batchAccountName has not yet been created."
else
    . "${0%/*}/process-utilities.sh"

    deletePoolsIfOutdatedProcesses=(
        "deletePoolIfOutdated \"on-demand-scan-request-pool\" \"onDemandScanRequestPool\""
        "deletePoolIfOutdated \"on-demand-url-scan-pool\" \"onDemandUrlScanPool\""
    )

    runCommandsWithoutSecretsInParallel deletePoolsIfOutdatedProcesses
fi

