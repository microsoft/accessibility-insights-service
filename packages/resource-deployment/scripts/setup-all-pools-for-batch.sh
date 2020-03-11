#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail


export resourceGroupName
export batchAccountName
export pool
export keyVault
export resourceName
export systemAssignedIdentities
export principalId
export enableSoftDeleteOnKeyVault

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function setupPools() {
    # Enable managed identity on Batch pools
    pools=$(az batch pool list --query "[].id" -o tsv)

    echo "Setup system identity for created pools"
    for pool in $pools; do
        command=". ${0%/*}/enable-system-identity-for-batch-vmss.sh"
        commandName="Enable System identity for pool $pool"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh"
    done

    echo "Setup tags in parallel"
    parallelProcesses=()
    for pool in $pools; do
        command=". \"${0%/*}/add-tags-for-batch-vmss.sh\""
        commandName="Setup tags for pool $pool"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
        parallelProcesses+=("$!")
    done
    waitForProcesses parallelProcesses
}

# Read script arguments
while getopts ":r:" option; do
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

# Login into Azure Batch account
echo "Logging into '$batchAccountName' Azure Batch account"
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

setupPools

echo "Successfully setup all pools for batch account $batchAccountName"
