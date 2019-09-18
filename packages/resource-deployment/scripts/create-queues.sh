#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export storageAccountName

createQueue() {
    local queue=$1

    echo "Checking if queue '$queue' exists in storage account '$storageAccountName'"
    queueExists=$(az storage queue exists --name "$queue" --account-name "$storageAccountName" --query "exists")

    if [ "$queueExists" = true ]; then
        echo "Queue '$queue' already exists"
    else
        az storage queue create --name "$queue" --account-name "$storageAccountName" 1>/dev/null
        echo "Successfully created queue '$queue'"
    fi
}

exitWithUsageInfo() {
    echo "
Usage: $0 -s <storage account name>
"
    exit 1
}

# Read script arguments
while getopts "s:" option; do
    case $option in
    s) storageAccountName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $storageAccountName ]]; then
    exitWithUsageInfo
fi

createQueue "scanrequest"
createQueue "scanrequest-dead"
createQueue "ondemand-scanrequest"
createQueue "ondemand-scanrequest-dead"
