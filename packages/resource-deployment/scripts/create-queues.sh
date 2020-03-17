#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export storageAccountName

createQueue() {
    local queue=$1

    echo "[create-queues] Checking if queue '$queue' exists in storage account '$storageAccountName'"
    queueExists=$(az storage queue exists --name "$queue" --account-name "$storageAccountName" --query "exists")

    if [ "$queueExists" = true ]; then
        echo "[create-queues] Queue '$queue' already exists"
    else
        az storage queue create --name "$queue" --account-name "$storageAccountName" 1>/dev/null
        echo "[create-queues] Successfully created queue '$queue'"
    fi
}

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group name>
"
    exit 1
}

function setupQueues() {

    echo "Creating Queues in parallel"

    local createQueueProcesses=(
        "createQueue \"scanrequest\""
        "createQueue \"scanrequest-dead\""
        "createQueue \"ondemand-scanrequest\""
        "createQueue \"ondemand-scanrequest-dead\""
        "createQueue \"ondemand-send-notification\""
        "createQueue \"ondemand-send-notification-dead\""
    )

    runCommandsWithoutSecretsInParallel createQueueProcesses

    echo "Successfully created all queues."
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

. "${0%/*}/process-utilities.sh"
. "${0%/*}/get-resource-names.sh"

setupQueues
