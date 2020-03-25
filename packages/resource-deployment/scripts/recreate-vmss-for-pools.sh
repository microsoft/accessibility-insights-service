#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export batchAccountName
export keyVault
export enableSoftDeleteOnKeyVault
export pools

areVmssOld=false
recycleVmssIntervalDays=15

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function checkIfVmssAreOld {
    areVmssOld=false
    local hasCreatedDateTags=false
    
    local createdDates=$(az vmss list \
        --query "[?tags.BatchAccountName=='$batchAccountName'].tags.VmssCreatedDate" \
        -o tsv
    )
    
    echo "VMSS created dates: $createdDates"

    for createdDate in $createdDates; do
        hasCreatedDateTags=true
        local recycleDate=$(date -d "$createdDate+$recycleVmssIntervalDays days" "+%Y-%m-%d")
        local currentDate=$(date "+%Y-%m-%d")
        
        if [[ "$currentDate" > "$recycleDate" ]] || [[ "$currentDate" == "$recycleDate" ]]; then
            echo "Found vmss with older created date $createdDate. 
                Expected to be not older than $recycleVmssIntervalDays days.
                Marking all vmss as old
            "
            areVmssOld=true
            break
        else
            echo "Found vmss to be new. Next recycle date - $recycleDate"
        fi
        
    done
    
    if [[ $hasCreatedDateTags == false ]]; then
        echo "Unable to find VmssCreatedDate tag. Assuming vmss are old."
        areVmssOld=true
    fi

    echo "Are vmss old? - $areVmssOld"
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
    echo "Scaling up pools by running batch account setup again."
    . "${0%/*}/batch-account-create.sh"
}

function recreatePoolVmss() {
    checkIfVmssAreOld

    if [[ $areVmssOld == false ]]; then
        return
    fi

    command="scaleDownPools ; scaleUpPools"
    commandName="Recreate pool vmss"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"
}

# Read script arguments
while getopts ":r:k:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

recreatePoolVmss

echo "Successfully recreated vmss for pools"
