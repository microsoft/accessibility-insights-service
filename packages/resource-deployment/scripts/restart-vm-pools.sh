#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

function rebootNodes() {
    local pools=$(az batch pool list --account-name "$batchAccountName" --query "[*].id" -o tsv)

    for pool in $pools; do
        local nodes
        nodes=$(az batch node list --account-name "$batchAccountName" --pool-id "$pool" --query "[*].id" -o tsv)

        for node in $nodes; do
            echo "Restarting node $node under pool $pool"
            az batch node reboot --node-id $node --pool-id $pool --account-name $batchAccountName --node-reboot-option taskcompletion 1>/dev/null
        done
    done
}

function waitForStablePoolNodes() {
    local pool=$1
    local nodeType=$2

    local ready=false
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for pool $pool $nodeType nodes to become stable after restart"
    end=$((SECONDS + 300))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        local total=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.total" -o tsv)
        local idle=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.idle" -o tsv)
        local running=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.running" -o tsv)

        local stable=$(($idle + $running))
        if [[ $stable == $total ]]; then
            ready=true
            break
        fi

        sleep 10
        printf "."
    done

    if [[ $total -gt 0 ]]; then
        if [[ $ready == false ]]; then
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
        waitForStablePoolNodes "$pool" "dedicated"
        waitForStablePoolNodes "$pool" "lowPriority"
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
