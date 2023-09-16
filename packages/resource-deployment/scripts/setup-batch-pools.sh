#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function waitForVmssToCompleteSetup() {
    # Allow VMSS to complete initial setup to mitigate system identity reset issue
    # There is no reliable way to detect when VMSS has completed initial setup hence use fixed delay
    local end=$((SECONDS + 300))
    echo "Waiting for Batch pools VMSS to complete setup"
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        sleep 15
        printf "."
    done
    echo " ended"
}

function setupPools() {
    # Enable managed identity on Batch pools
    pools=$(az batch pool list --query "[].id" -o tsv)

    echo "Setup tags for VMSS"
    parallelProcesses=()
    for pool in ${pools}; do
        command=". \"${0%/*}/add-tags-for-batch-vmss.sh\""
        commandName="Setup tags for pool ${pool}"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
        parallelProcesses+=("$!")
    done
    waitForProcesses parallelProcesses

    echo "Enable VMSS automatic OS image upgrades"
    parallelProcesses=()
    for pool in ${pools}; do
        command=". \"${0%/*}/enable-os-image-upgrade.sh\""
        commandName="Enable VMSS automatic OS image upgrades for pool ${pool}"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh" &
        parallelProcesses+=("$!")
    done
    waitForProcesses parallelProcesses

    echo "Enable system identity for VMSS"
    # Runs pools update script sequentially
    for pool in ${pools}; do
        command=". ${0%/*}/enable-system-identity-for-batch-vmss.sh"
        commandName="Enable system identity for pool ${pool}"
        . "${0%/*}/run-command-on-all-vmss-for-pool.sh"
    done
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

# Login into Azure Batch account
echo "Logging into '${batchAccountName}' Azure Batch account"
az batch account login --name "${batchAccountName}" --resource-group "${resourceGroupName}"

waitForVmssToCompleteSetup
setupPools

echo "Successfully setup all pools for batch account ${batchAccountName}"
