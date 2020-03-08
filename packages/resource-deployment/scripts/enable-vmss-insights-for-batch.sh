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
while getopts ":r:t:k:w:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $enableSoftDeleteOnKeyVault ]] || [[ -z $batchTemplateFile ]] || [[ -z $logAnalyticsWorkspaceId ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

batchAccountName=$(az batch account list \ 
                    --resource-group demuruge4 \
                    --query "[?starts_with(name, 'allybatch')].name|[0]" \
                    -o tsv
                )

resourceGroupSuffix=${batchAccountName:9}
logAnalyticsWorkspaceId="allylogAnalytics$resourceGroupSuffix"

# Login into Azure Batch account
echo "Logging into '$batchAccountName' Azure Batch account"
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

# Enable managed identity on Batch pools
pools=$(az batch pool list --query "[].id" -o tsv)
parallelProcesses=()
checkVmssStatusBeforeSetup=false

echo "Running pool setup in parallel"
for pool in $pools; do
    . "${0%/*}/batch-pool-setup.sh" &
    parallelProcesses+=("$!")
done
waitForProcesses parallelProcesses

echo "Successfully enabled Azure Monitor for batch account pools - $batchAccountName"
