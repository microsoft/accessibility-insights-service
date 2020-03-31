#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group name> -p <parameter file path> [-t <delete timeout>]
"
    exit 1
}

deletePool() {
    poolId=$1

    echo "deleting pool $poolId"
    az batch pool delete --account-name $batchAccountName --pool-id $poolId --yes

    waitForDelete $poolId
    echo "done"
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

    if [ "$poolExists" == "true" ]; then
        echo "Pool did not finish deleting within $deleteTimeout seconds"
    fi
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

deletePoolWhenNodesAreIdle() {
    poolId=$1

    command="deletePool $poolId"
    commandName="Delete pool $poolId"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"
}

compareConfigFileToDeployedConfig() {
    poolId=$1
    batchConfigPropertyName=$2
    templateFileParameterName=$3

    query="[?id=='$poolId'].$batchConfigPropertyName"

    expectedValue=$(cat $parameterFilePath | jq -r ".parameters.$templateFileParameterName.value")
    actualValue=$(az batch pool list --account-name "$batchAccountName" --query "$query" -o tsv)

    if [ -z "$expectedValue" ] || [ "$expectedValue" == "null" ]; then
        echo "No value for $templateFileParameterName found in deployment template."
    elif [ "$expectedValue" != "$actualValue" ]; then
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
        deletePoolWhenNodesAreIdle "$poolId"
        return
    fi

    echo "$poolId does not need to be recreated."
}

# Read script arguments
while getopts ":p:t:r:" option; do
    case $option in
    p) parameterFilePath=${OPTARG} ;;
    t) deleteTimeout=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $parameterFilePath ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

if [[ -z $deleteTimeout ]]; then
    deleteTimeout=1200
fi

. "${0%/*}/get-resource-names.sh"

batchAccountExists=$(az resource list --name $batchAccountName -o tsv)
if [[ -z "$batchAccountExists" ]]; then
    echo "batch account $batchAccountName has not yet been created."
else
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

    . "${0%/*}/process-utilities.sh"

    pools=$(az batch pool list --query "[].id" -o tsv)
    deletePoolsIfOutdatedProcesses=()
    for pool in $pools; do
        camelCasePoolId=$(echo "$pool" | sed -r 's/(-)([a-z])/\U\2/g')
        deletePoolsIfOutdatedProcesses+=("deletePoolIfOutdated \"$pool\" \"$camelCasePoolId\"")
    done

    runCommandsWithoutSecretsInParallel deletePoolsIfOutdatedProcesses
fi

