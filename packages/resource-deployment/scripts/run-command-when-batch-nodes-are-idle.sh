#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -c <command to run> -n <command name>
"
    exit 1
}

# Read script arguments
while getopts ":r:c:n:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) command=${OPTARG} ;;
    n) commandName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $command ]] ||  [[ -z $commandName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Invoked command to run when all pools are idle:
resource group:$resourceGroupName
commandName: $commandName
"

. "${0%/*}/process-utilities.sh"

function setJobScheduleStatus {
    local status=$1

    local schedules=$(az batch job-schedule list --query "[].id" -o tsv)

    for schedule in $schedules; do
        echo "Setting job schedule $schedule status to $status"
        az batch job-schedule $status --job-schedule-id "$schedule"
    done
}

function disableJobSchedule {
    setJobScheduleStatus "disable"
}

function enableJobSchedule {
    setJobScheduleStatus "disable"
}

waitForNodesToGoIdleByNodeType() {
    local isIdle=false
    local pool=$1
    local nodeType=$2
    local waitTime=1800
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for $nodeType nodes under $pool to go idle"

    local endTime=$((SECONDS + waitTime))
    printf " - Running .."
    while [ $SECONDS -le $endTime ]; do

        local totalCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.running" \
                                -o tsv
                            )
        local idleCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.idle" \
                                -o tsv
                            )  
        local startTaskFailedCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.startTaskFailed" \
                                -o tsv
                            )  

        local unusableCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.unusable" \
                                -o tsv
                            )  

        local stableCount=$(( $idleCount + $startTaskFailedCount + $unusableCount ))

        if [[ $stableCount == $totalCount ]]; then
            echo "$nodeType nodes under pool: $pool are idle."
            isIdle=true
            break;
        else
            printf "."
            sleep 5
        fi
    done

    echo "Currrent Pool Status $pool for $nodeType:"
    az batch pool node-counts list --query "$nodeTypeContentSelector"
    
    if [[ $isIdle == false ]]; then
        echo "Pool $pool & $nodeType is not in the expected state."
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

    pools=$(az batch pool list --query "[].id" -o tsv)

    disableJobSchedule

    echo "sleeping 10 seconds to wait for any jobs that got kicked off
     before disabling schedule to start using the nodes"
    sleep 10

    waitForPoolsToBeIdle
    
    echo "Invoking command $commandName"
    eval "$command"

    enableJobSchedule
}

runCommand
