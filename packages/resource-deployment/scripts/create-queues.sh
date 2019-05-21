#!/bin/bash
set -eo pipefail

# shellcheck disable=SC1091
. './utilities/create-queue.sh'

exitWithUsageInfo() {
    echo \
        "
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
