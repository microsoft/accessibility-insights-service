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


restartBatchPools() {
    # Login into Azure Batch account
    echo "Logging into '$batchAccountName' Azure Batch account"
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

    echo "Querying pools for $batchAccountName"
    local batchPoolIds=$(az batch pool list --account-name "$batchAccountName" --query "[*].id" -o tsv)

    for poolId in $batchPoolIds; do
        local poolNodeIds

        echo "Querying node list for poolId $poolId"
        poolNodeIds=$(az batch node list --account-name "$batchAccountName" --pool-id "$poolId" --query "[*].id" -o tsv)

        for nodeId in $poolNodeIds; do
            echo "Restarting node with nodeId $nodeId under poolId $poolId"
            az batch node reboot --node-id $nodeId --pool-id $poolId --account-name $batchAccountName --node-reboot-option taskcompletion 1>/dev/null
        done
    done
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
