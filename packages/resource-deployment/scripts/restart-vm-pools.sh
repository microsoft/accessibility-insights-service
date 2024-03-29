#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

function rebootNodes() {
    local pools=$(az batch pool list --account-name "$batchAccountName" --query "[*].id" -o tsv)

    for pool in $pools; do
        local poolId="${pool//[$'\t\r\n ']/}"
        local nodes=$(az batch node list --account-name "$batchAccountName" --pool-id "$poolId" --query "[*].id" -o tsv)

        for node in $nodes; do
            local nodeId="${node//[$'\t\r\n ']/}"

            echo "Restarting node $nodeId under pool $poolId"
            az batch node reboot --node-id "$nodeId" --pool-id "$poolId" --account-name "$batchAccountName" --node-reboot-option terminate 1>/dev/null
        done
    done
}

function waitForStablePoolNodes() {
    local pool=$1
    local nodeType=$2

    local ready=false
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for pool $pool $nodeType nodes to become stable after restart"
    end=$((SECONDS + 2700))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        # Node states https://docs.microsoft.com/en-us/azure/batch/batch-get-resource-counts#node-state-counts

        local total=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.total" -o tsv)
        local idle=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.idle" -o tsv)
        local running=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.running" -o tsv)

        local stable=$(($idle + $running))
        if [[ $stable == $total ]]; then
            ready=true
            break
        fi

        sleep 5
        printf "."
    done

    if [[ $total -gt 0 ]]; then
        if [[ $ready == false ]]; then
            az batch pool node-counts list --account-name "$batchAccountName"
            echo "Pool $pool $nodeType nodes did not become stable after restart"
            exit 1
        else
            echo "Pool $pool $nodeType nodes already stable after restart"
        fi
    else
        echo "Pool $pool has no $nodeType nodes"
    fi
}

function waitForStablePools() {
    local pools=$(az batch pool list --account-name "$batchAccountName" --query "[*].id" -o tsv)

    for pool in $pools; do
        local poolId="${pool//[$'\t\r\n ']/}"

        waitForStablePoolNodes "$poolId" "dedicated"
        waitForStablePoolNodes "$poolId" "lowPriority"
    done
}

restartBatchPools() {
    command="rebootNodes"
    commandName="Reboot all pool nodes"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"
}

# Read script arguments
while getopts ":r:s:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

restartBatchPools
waitForStablePools
