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
export logAnalyticsWorkspaceId

# Set default ARM Batch account template files
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

trap "kill 0" EXIT

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

function scaleDownPools() {
    pools=$(az batch pool list --query "[].id" -o tsv)

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

function recreatePoolVmss() {
    # Login into Azure Batch account
    echo "Logging into '$batchAccountName' Azure Batch account"
    az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

    scaleDownPools

    # Deploy Azure Batch account using resource manager template
    echo "Deploying Azure Batch account in resource group $resourceGroupName with template $batchTemplateFile"
    resources=$(
        az group deployment create \
            --resource-group "$resourceGroupName" \
            --template-file "$batchTemplateFile" \
            --query "properties.outputResources[].id" \
            --parameters enableSoftDeleteOnKeyVault="$enableSoftDeleteOnKeyVault" \
            -o tsv
    )

    . "${0%/*}/setup-all-pools-for-batch.sh"
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
