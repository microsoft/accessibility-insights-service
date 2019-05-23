#!/bin/bash
set -eo pipefail

createQueue() {
    queue=$1
    storageAccountName=$2

    echo "Checking if queue $queue exists in storage account $storageAccountName"
    queueExists=$(az storage queue exists --name "$queue" --account-name "$storageAccountName" --query "exists")

    if [ "$queueExists" = true ]; then
        echo "Queue '$queue' already exists"
    else
        az storage queue create --name "$queue" --account-name "$storageAccountName"
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

createQueue "scanrequest" "$storageAccountName"
createQueue "scanrequest-dead" "$storageAccountName"
