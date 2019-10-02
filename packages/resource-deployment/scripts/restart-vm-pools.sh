#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export subscription

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id>
"
    exit 1
}

getBatchAccountName() {
    declare -n refResult=$1

    echo "Fetching batch account name under resource group $resourceGroupName"
    # shellcheck disable=SC2034
    refResult=$(az batch account list --resource-group "$resourceGroupName" --subscription "$subscription" --query "[0].name" -o tsv)
    echo "Found batch account name - $refResult"
}

restartBatchPools() {
    local batchAccountName
    getBatchAccountName batchAccountName

    echo "Querying pools for $batchAccountName"
    batchPoolIds=$(az batch pool list --account-name "$batchAccountName" --subscription "$subscription" --query "[*].id" -o tsv)

    for poolId in $batchPoolIds; do
        local poolNodeIds

        echo "Querying node list for poolId $poolId"
        poolNodeIds=$(az batch node list --account-name "$batchAccountName" --subscription "$subscription" --pool-id "$poolId" --query "[*].id" -o tsv)

        for nodeId in $poolNodeIds; do
            echo "Restarting node with nodeId $nodeId under poolId $poolId"
            az batch node reboot --node-id $nodeId --pool-id $poolId --account-name $batchAccountName --subscription $subscription --node-reboot-option taskcompletion 1>/dev/null
        done
    done
}

# Read script arguments
while getopts ":r:s:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]]; then
    exitWithUsageInfo
fi

restartBatchPools
