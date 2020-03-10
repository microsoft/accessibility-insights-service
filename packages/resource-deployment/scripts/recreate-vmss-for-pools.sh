#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail


export resourceGroupName
export batchAccountName
export keyVault
export enableSoftDeleteOnKeyVault
export pools

# Set default ARM Batch account template files
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -k <enable soft delete on keyvault>
"
    exit 1
}

function waitForProcesses() {
    local processesToWaitFor=$1

    list="$processesToWaitFor[@]"
    for pid in "${!list}"; do
        echo "Waiting for process with pid $pid"
        wait $pid
        echo "Process with pid $pid exited"
    done
}

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
    setJobScheduleStatus "enable"
}

waitForNodesToGoIdleByNodeType() {
    local hasStarted=false
    local pool=$1
    local nodeType=$2
    local waitTime=1800
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for $nodeType nodes under $pool to go idle"

    local endTime=$((SECONDS + waitTime))
    printf " - Running .."
    while [ $SECONDS -le $endTime ]; do

        local runningCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.running" \
                                -o tsv
                            ) 
        
        if [[ $runningCount == 0 ]]; then
            echo "Nodes under $nodeType for pool: $pool under  has started."
            hasStarted=true
            break;
        else
            printf "."
            sleep 5
        fi
    done

    echo "Currrent Pool Status $pool for $nodeType:"
    az batch pool node-counts list --query "$nodeTypeContentSelector"
    
    if [[ $hasStarted == false ]]; then
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

function scaleDownPools() {
    parallelProcesses=()
    echo "Resizing all pools size to 0"
    for pool in $pools; do
        az batch pool resize \
            --pool-id $pool \
            --target-dedicated-nodes 0 \
            --target-low-priority-nodes 0 \
            --node-deallocation-option requeue &
        
        parallelProcesses+=("$!")

    done
    waitForProcesses parallelProcesses

    echo "Waiting for pool to be stable"
    for pool in $pools; do
        local query="az batch pool show --pool-id \"$pool\" --query \"allocationState=='steady'\""

        . "${0%/*}/wait-for-deployment.sh" -n "$pool in Steady state" -q "$query" -t 900
    done
}

function scaleUpPools {
    echo "Scaling up pools: Deploying Azure Batch account in resource group $resourceGroupName with template $batchTemplateFile"
    resources=$(
        az group deployment create \
            --resource-group "$resourceGroupName" \
            --template-file "$batchTemplateFile" \
            --query "properties.outputResources[].id" \
            --parameters enableSoftDeleteOnKeyVault="$enableSoftDeleteOnKeyVault" \
            -o tsv
    )
}

function recreatePoolVmss() {
    # Login into Azure Batch account
    echo "Logging into '$batchAccountName' Azure Batch account"
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

    pools=$(az batch pool list --query "[].id" -o tsv)

    disableJobSchedule
    waitForPoolsToBeIdle
    scaleDownPools
    scaleUpPools
    . "${0%/*}/setup-all-pools-for-batch.sh"
    enableJobSchedule
}

# Read script arguments
while getopts ":r:k:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) enableSoftDeleteOnKeyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $enableSoftDeleteOnKeyVault ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/set-resource-names.sh"

recreatePoolVmss

echo "Successfully recreated vmss for pools"
