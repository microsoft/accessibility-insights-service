#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export batchAccountName
export keyVault
export pools

os=$(uname -s 2>/dev/null) || true
poolsOutdated=false
recyclePoolIntervalDays=7

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -p <parameter template file path> [-d <pass \"true\" to force pools to drop>]
"
    exit 1
}

function checkIfpoolsOutdated() {
    local poolsCreationTime
    local recycleDate
    local currentDate
    local createdDate

    poolsCreationTime=$(
        az batch pool list --query "[].creationTime" -o tsv
    )

    for poolCreationTime in ${poolsCreationTime}; do
        if [[ ${os} == "Darwin" ]]; then
            createdDate=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${poolCreationTime}" "+%Y/%m/%d")
            recycleDate=$(date -j -v +"${recyclePoolIntervalDays}"d -f "%Y/%m/%d" "${createdDate}" "+%Y/%m/%d")
            currentDate=$(date "+%Y/%m/%d")
        else
            createdDate=$(date "+%Y/%m/%d" -d "${poolCreationTime}")
            recycleDate=$(date -d "${createdDate}+${recyclePoolIntervalDays} days" "+%Y/%m/%d")
            currentDate=$(date "+%Y/%m/%d")
        fi

        if [[ "${currentDate}" > "${recycleDate}" ]] || [[ "${currentDate}" == "${recycleDate}" ]]; then
            poolsOutdated=true

            break
        fi
    done

    if [[ ${poolsOutdated} == true ]]; then
        echo "Recycling Batch pools after ${recyclePoolIntervalDays} days interval. Batch pool created date ${createdDate}"
    else
        echo "Skipping Batch pools recycle. Target recycle date ${recycleDate}"
    fi
}

function compareParameterFileToDeployedConfig() {
    local poolId=$1
    local batchConfigPropertyName=$2
    local templateFileParameterName=$3
    local actualValue

    query="[?id=='${poolId}'].${batchConfigPropertyName}"
    expectedValue=$(cat "${parameterFilePath}" | jq -r ".parameters.${templateFileParameterName}.value") || {
        echo "Bash jq command error. Validate if jq command is installed. Run to install on Ubuntu 'sudo apt-get install jq' or Mac OS 'brew install jq'" && exit 1
    }
    actualValue=$(az batch pool list --account-name "${batchAccountName}" --query "${query}" -o tsv)

    if [[ -z ${expectedValue} ]] || [[ ${expectedValue} == "null" ]]; then
        echo "No ${templateFileParameterName} parameter value found in template file ${parameterFilePath}"
    elif [[ ${expectedValue} != "${actualValue}" ]]; then
        echo "The ${batchConfigPropertyName} value for Batch pool ${poolId} must be updated from ${actualValue} to ${expectedValue}. Batch pool must be deleted to perform update."
        poolConfigOutdated=true
    else
        echo "The template ${batchConfigPropertyName} value for Batch pool ${poolId} has no changes."
    fi
}

function checkIfPoolConfigOutdated() {
    local poolId=$1
    local poolPropertyNamePrefix=$2

    poolConfigOutdated=false

    compareParameterFileToDeployedConfig "${poolId}" "vmSize" "${poolPropertyNamePrefix}VmSize"
    if [[ ${poolConfigOutdated} == "true" ]]; then
        return
    fi

    compareParameterFileToDeployedConfig "${poolId}" "taskSlotsPerNode" "${poolPropertyNamePrefix}TaskSlotsPerNode"
    if [[ ${poolConfigOutdated} == "true" ]]; then
        return
    fi
}

function checkPoolConfigs() {
    for pool in ${pools}; do
        local lowercase
        local camelCase=""
        local camelCasePoolId
        local poolId="${pool//[$'\t\r\n ']/}"

        echo "Validating Batch pool ${poolId} configuration..."

        if [[ ${os} == "Darwin" ]]; then
            local words=(${poolId//-/ })
            for word in "${words[@]}"; do
                lowercase=$(echo ${word} | tr [:upper:] [:lower:])
                camelCase=$camelCase$(echo ${lowercase:0:1} | tr [:lower:] [:upper:])${lowercase:1}
            done
            camelCasePoolId=$(echo ${camelCase:0:1} | tr [:upper:] [:lower:])${camelCase:1}
        else
            camelCasePoolId=$(echo "$poolId" | sed -r 's/(-)([a-z])/\U\2/g')
        fi

        checkIfPoolConfigOutdated "${poolId}" "${camelCasePoolId}"
        if [[ ${poolConfigOutdated} == "true" ]]; then
            return
        fi
    done
}

deletePools() {
    for pool in ${pools}; do
        local poolId="${pool//[$'\t\r\n ']/}"

        echo "Deleting Batch pool ${poolId}"
        az batch pool delete --account-name "${batchAccountName}" --pool-id "${poolId}" --yes
    done

    for pool in ${pools}; do
        local poolId="${pool//[$'\t\r\n ']/}"

        waitForDelete "${poolId}"
        echo "Finished deleting Batch pool ${poolId}"
    done
}

waitForDelete() {
    local poolId=$1
    local waiting=false
    local deleteTimeout=1200
    local end=$((SECONDS + $deleteTimeout))

    checkIfPoolExists "${poolId}"
    while [ "${poolExists}" == "true" ] && [ "${SECONDS}" -le "${end}" ]; do
        if [[ ${waiting} != true ]]; then
            waiting=true
            echo "Waiting for Batch pool ${poolId} to delete"
            printf " - Running .."
        fi

        sleep 5
        printf "."
        checkIfPoolExists "${poolId}"
    done

    if [[ ${poolExists} == "true" ]]; then
        echo "Unable to delete Batch pool ${poolId} within ${deleteTimeout} seconds"
    fi
}

checkIfPoolExists() {
    local poolId=$1

    poolExists=$(az batch pool list --account-name "${batchAccountName}" --query "[?id=='${poolId}']" -o tsv)
    if [[ -z ${poolExists} ]]; then
        poolExists=false
    else
        poolExists=true
    fi
}

function deletePoolsWhenNodesAreIdle() {
    local command="deletePools"
    local commandName="Delete Batch pools"
    . "${0%/*}/run-command-when-batch-nodes-are-idle.sh"

    echo "Successfully deleted Batch pools"
}

function deletePoolsIfNeeded() {
    pools=$(az batch pool list --query "[].id" -o tsv)
    if [[ -z ${pools} ]]; then
        return
    fi

    if [[ ${dropPools} != true ]]; then
        checkIfpoolsOutdated
        if [[ ${poolsOutdated} != true ]]; then
            checkPoolConfigs
            if [[ ${poolConfigOutdated} != true ]]; then
                return
            fi
        fi
    fi

    deletePoolsWhenNodesAreIdle
}

# Read script arguments
while getopts ":r:p:d:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    p) parameterFilePath=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${parameterFilePath} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

batchAccountExists=$(az resource list --name "${batchAccountName}" -o tsv)
if [[ -n ${batchAccountExists} ]]; then
    echo "Logging into ${batchAccountName} Azure Batch account"
    az batch account login --name "${batchAccountName}" --resource-group "${resourceGroupName}"

    deletePoolsIfNeeded
fi
