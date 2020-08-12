#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export batchAccountName
export keyVault
export enableSoftDeleteOnKeyVault
export pools

kernelName=$(uname -s 2>/dev/null) || true
areVmssOld=false
recycleVmssIntervalDays=10

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -p <parameter template file path> [-d <pass \"true\" to force pools to drop>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function checkIfVmssAreOld() {
    areVmssOld=false
    local hasCreatedDateTags=false

    local createdDates=$(
        az vmss list \
            --query "[?tags.BatchAccountName=='$batchAccountName'].tags.VmssCreatedDate" \
            -o tsv
    )

    for createdDate in $createdDates; do
        hasCreatedDateTags=true

        if [[ $kernelName == "Darwin" ]]; then
            local recycleDate=$(date -j -v +"$recycleVmssIntervalDays"d -f "%Y-%m-%d" "$createdDate" "+%Y-%m-%d")
            local currentDate=$(date "+%Y-%m-%d")
        else
            local recycleDate=$(date -d "$createdDate+$recycleVmssIntervalDays days" "+%Y-%m-%d")
            local currentDate=$(date "+%Y-%m-%d")
        fi

        if [[ "$currentDate" > "$recycleDate" ]] || [[ "$currentDate" == "$recycleDate" ]]; then
            areVmssOld=true
            break
        fi
    done

    if [[ $hasCreatedDateTags == false ]]; then
        echo "Unable to find 'VmssCreatedDate' VMSS resource group tag. Recycling VMSS."
        areVmssOld=true
    else
        if [[ $areVmssOld == true ]]; then
            echo "Recycling VMSS after $recycleVmssIntervalDays days. VMSS created date $createdDate"
        else
            echo "Skipping VMSS recycle. Target recycle date $recycleDate"
        fi
    fi
}

function compareParameterFileToDeployedConfig() {
    local poolId=$1
    local batchConfigPropertyName=$2
    local templateFileParameterName=$3

    query="[?id=='$poolId'].$batchConfigPropertyName"
    expectedValue=$(cat $parameterFilePath | jq -r ".parameters.$templateFileParameterName.value") || {
        echo "Bash jq command error. Validate if jq command is installed. Run to install on Ubuntu 'sudo apt-get install jq' or Mac OS 'brew install jq'" && exit 1
    }
    local actualValue=$(az batch pool list --account-name "$batchAccountName" --query "$query" -o tsv)

    if [[ -z $expectedValue ]] || [[ $expectedValue == "null" ]]; then
        echo "No '$templateFileParameterName' parameter value found in template file $parameterFilePath"
    elif [ $expectedValue != $actualValue ]; then
        echo "The '$batchConfigPropertyName' value for $poolId must be updated from '$actualValue' to '$expectedValue'"
        echo "Pool must be deleted to perform update."
        poolConfigOutdated=true
    else
        echo "The template '$batchConfigPropertyName' value for $poolId has no changes."
    fi
}

function checkIfPoolConfigOutdated() {
    local poolId=$1
    local poolPropertyNamePrefix=$2

    poolConfigOutdated=false

    compareParameterFileToDeployedConfig $poolId "vmSize" "${poolPropertyNamePrefix}VmSize"
    if [[ $poolConfigOutdated == "true" ]]; then
        return
    fi

    compareParameterFileToDeployedConfig $poolId "maxTasksPerNode" "${poolPropertyNamePrefix}MaxTasksPerNode"
    if [[ $poolConfigOutdated == "true" ]]; then
        return
    fi
}

function checkPoolConfigs() {
    for pool in $pools; do
        echo "Validating pool $pool configuration..."

        camelCase=""
        if [[ $kernelName == "Darwin" ]]; then
            local words=(${pool//-/ })
            for word in "${words[@]}"; do
                local lowercase=$(echo ${word} | tr [:upper:] [:lower:])
                local camelCase=$camelCase$(echo ${lowercase:0:1} | tr [:lower:] [:upper:])${lowercase:1}
            done
            local camelCasePoolId=$(echo ${camelCase:0:1} | tr [:upper:] [:lower:])${camelCase:1}
        else
            local camelCasePoolId=$(echo "$pool" | sed -r 's/(-)([a-z])/\U\2/g')
        fi

        checkIfPoolConfigOutdated "$pool" "$camelCasePoolId"
        if [[ $poolConfigOutdated == "true" ]]; then
            return
        fi
    done
}

deletePools() {
    for pool in $pools; do
        echo "Deleting Batch pool $pool"
        az batch pool delete --account-name $batchAccountName --pool-id $pool --yes
    done

    for pool in $pools; do
        waitForDelete $pool
        echo "Finished deleting Batch pool $pool"
    done
}

waitForDelete() {
    local poolId=$1

    checkIfPoolExists $poolId

    local waiting=false
    local deleteTimeout=1200
    local end=$((SECONDS + $deleteTimeout))
    while [ "$poolExists" == "true" ] && [ $SECONDS -le $end ]; do
        if [[ $waiting != true ]]; then
            waiting=true
            echo "Waiting for $poolId to delete"
            printf " - Running .."
        fi

        sleep 5
        printf "."
        checkIfPoolExists $poolId
    done

    if [[ $poolExists == "true" ]]; then
        echo "Unable to delete pool $poolId within $deleteTimeout seconds"
    fi
}

checkIfPoolExists() {
    local poolId=$1

    poolExists=$(az batch pool list --account-name "$batchAccountName" --query "[?id=='$poolId']" -o tsv)
    if [[ -z $poolExists ]]; then
        poolExists=false
    else
        poolExists=true
    fi
}

function deletePoolsWhenNodesAreIdle() {
    local command="deletePools"
    local commandName="Delete pool VMSS"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"

    echo "Successfully deleted Btach pools"
}

function deletePoolsIfNeeded() {
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"
    pools=$(az batch pool list --query "[].id" -o tsv)
    if [[ -z $pools ]]; then
        return
    fi

    if [[ $dropPools != true ]]; then
        checkIfVmssAreOld
        if [[ $areVmssOld != true ]]; then
            checkPoolConfigs
            if [[ $poolConfigOutdated != true ]]; then
                return
            fi
        fi
    fi

    deletePoolsWhenNodesAreIdle
}

# Read script arguments
while getopts ":r:p:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) parameterFilePath=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $parameterFilePath ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

batchAccountExists=$(az resource list --name $batchAccountName -o tsv)
if [[ -z $batchAccountExists ]]; then
    echo "Batch account $batchAccountName has not yet been created."
else
    deletePoolsIfNeeded
fi
