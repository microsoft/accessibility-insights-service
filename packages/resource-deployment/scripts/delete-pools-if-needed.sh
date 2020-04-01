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
Usage: $0 -r <resource group> -p <parameter template file path> [-d <pass \"true\" to force pools to drop>]
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

    for createdDate in $createdDates; do
        hasCreatedDateTags=true
        echo "VMSS created date: $createdDate"
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

function compareParameterFileToDeployedConfig() {
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
        echo "Pool must be deleted to perform update."
        poolConfigOutdated=true
    fi
}

function checkIfPoolConfigOutdated {
    poolId=$1
    poolPropertyNamePrefix=$2

    poolConfigOutdated=false

    compareParameterFileToDeployedConfig $poolId "vmSize" "${poolPropertyNamePrefix}VmSize"
    if [ $poolConfigOutdated == "true" ]; then
        return
    fi

    compareParameterFileToDeployedConfig $poolId "maxTasksPerNode" "${poolPropertyNamePrefix}MaxTasksPerNode"
    if [ $poolConfigOutdated == "true" ]; then
        return
    fi
}

function checkPoolConfigs {
    for pool in $pools; do
        camelCasePoolId=$(echo "$pool" | sed -r 's/(-)([a-z])/\U\2/g')
        checkIfPoolConfigOutdated "$pool" "$camelCasePoolId"
        if [ $poolConfigOutdated ]; then
            return
        fi
    done
}

deletePools() {
    for pool in $pools; do
        echo "deleting pool $pool"
        az batch pool delete --account-name $batchAccountName --pool-id $pool --yes
    done

    for pool in $pools; do
        waitForDelete $pool
        echo "Finished deleting $pool"
    done
}

waitForDelete() {
    poolId=$1

    checkIfPoolExists $poolId
    waiting=false
    deleteTimeout=1200
    end=$((SECONDS + $deleteTimeout))
    while [ "$poolExists" == "true" ] && [ $SECONDS -le $end ]; do
        if [ "$waiting" != true ]; then
            waiting=true
            echo "Waiting for $poolId to delete"
            printf " - Running .."
        fi

        sleep 5
        printf "."
        checkIfPoolExists $poolId
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

function deletePoolsWhenNodesAreIdle() {
    command="deletePools"
    commandName="Delete pool vmss"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"

    echo "Successfully deleted pools"
}

function deletePoolsIfNeeded() {
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"
    pools=$(az batch pool list --query "[].id" -o tsv)
    if [[ -z "$pools" ]]; then
        return
    fi

    if [[ "$dropPools" != true ]]; then
        checkIfVmssAreOld
        if [[ $areVmssOld != true ]]; then
            checkPoolConfigs
            if [[ $poolConfigOutdated != true ]]; then
                echo "Pools do not need to be recreated."
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
if [[ -z "$batchAccountExists" ]]; then
    echo "batch account $batchAccountName has not yet been created."
else
    deletePoolsIfNeeded
fi
