#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -c <command to run> -n <command name> [-p <pool ids (if not specified, will wait for all pools to become idle)>]
"
    exit 1
}

# Read script arguments
while getopts ":r:c:n:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) command=${OPTARG} ;;
    n) commandName=${OPTARG} ;;
    p) pools=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $command ]] || [[ -z $commandName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Run command when all pools are idle:
    Resource group: $resourceGroupName
    Command name: $commandName
"

. "${0%/*}/process-utilities.sh"

function setJobScheduleStatus() {
    local status=$1

    local query="[?contains('$pools', jobSpecification.poolInfo.poolId)].id"
    local schedules=$(az batch job-schedule list --query "$query" -o tsv)
    for schedule in $schedules; do
        echo "Setting job schedule $schedule status to $status"
        az batch job-schedule $status --job-schedule-id "$schedule" 1>/dev/null
    done
}

function disableJobSchedule() {
    setJobScheduleStatus "disable"
}

function enableJobSchedule() {
    setJobScheduleStatus "enable"
}

waitForNodesToGoIdleByNodeType() {
    local pool=$1
    local nodeType=$2

    local isIdle=false
    local waitTime=1800
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for $nodeType nodes under $pool to go idle"

    local endTime=$((SECONDS + waitTime))
    printf " - Running .."
    while [ $SECONDS -le $endTime ]; do
        # Node states https://docs.microsoft.com/en-us/azure/batch/batch-get-resource-counts#node-state-counts

        local totalCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.total" -o tsv)
        local idleCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.idle" -o tsv)
        local offlineCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.offline" -o tsv)
        local preemptedCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.preempted" -o tsv)
        # error states
        local startTaskFailedCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.startTaskFailed" -o tsv)
        local unusableCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.unusable" -o tsv)
        local unknownCount=$(az batch pool node-counts list --account-name "$batchAccountName" --query "$nodeTypeContentSelector.unknown" -o tsv)

        local stableCount=$(($idleCount + $offlineCount + $preemptedCount + $startTaskFailedCount + $unusableCount + $unknownCount))
        if [[ $stableCount == $totalCount ]]; then
            echo "The '$nodeType' nodes under $pool pool are idle."
            isIdle=true
            break
        else
            printf "."
            sleep 5
        fi
    done

    echo "Current $pool pool status for $nodeType:"
    az batch pool node-counts list --query "$nodeTypeContentSelector"

    if [[ $isIdle == false ]]; then
        echo "Pool $pool $nodeType nodes did not become idle."
        az batch pool node-counts list --query "$nodeTypeContentSelector"

        enableJobSchedule
        exit 1
    fi
}

function waitForPoolsToBeIdle() {
    for pool in $pools; do
        waitForNodesToGoIdleByNodeType "$pool" "dedicated"
        waitForNodesToGoIdleByNodeType "$pool" "lowPriority"
    done
}

function runCommand() {
    # Login into Azure Batch account
    echo "Logging into '$batchAccountName' Azure Batch account"
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

    if [[ -z "$pools" ]]; then
        pools=$(az batch pool list --query "[].id" -o tsv)
    fi

    disableJobSchedule

    echo "Wait for any jobs that got kicked off after disabling schedule before start using the nodes."
    sleep 10

    waitForPoolsToBeIdle

    echo "Invoking command: $commandName"
    eval "$command"

    enableJobSchedule
}

runCommand
