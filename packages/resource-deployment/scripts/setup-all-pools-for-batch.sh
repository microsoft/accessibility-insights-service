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
export logAnalyticsWorkspaceId

trap "kill 0" EXIT

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
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

batchAccountName=$(az batch account list \
    --resource-group "$resourceGroupName" \
    --query "[?starts_with(name, 'allybatch')].name|[0]" \
    -o tsv)
echo "Fetched batch account $batchAccountName"

resourceGroupSuffix=${batchAccountName:9}
logAnalyticsWorkspaceId="allylogAnalytics$resourceGroupSuffix"
keyVault="allyvault$resourceGroupSuffix"

# Login into Azure Batch account
echo "Logging into '$batchAccountName' Azure Batch account"
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

# Enable managed identity on Batch pools
pools=$(az batch pool list --query "[].id" -o tsv)

echo "Setup system identity for created pools"
for pool in $pools; do
    command="${0%/*}/enable-system-identity-for-batch-vmss.sh"
    commandName="System identity for pool $pool"
    . "${0%/*}/run-command-on-all-vmss-for-pool.sh"
done

echo "Setup monitor for pools in parallel"
parallelProcesses=()
for pool in $pools; do
    command="${0%/*}/enable-monitor-for-batch-vmss.sh"
    commandName="Setup monitor for pool $pool"
    . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
    parallelProcesses+=("$!")
done
waitForProcesses parallelProcesses

echo "Successfully enabled Azure Monitor for batch account pools - $batchAccountName"
