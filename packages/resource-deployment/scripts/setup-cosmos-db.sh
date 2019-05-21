#!/bin/bash
set -eo pipefail

# shellcheck disable=SC1091
. './utilities/cosmos-utilities.sh'

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -c <cosmosAccountName> -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts "c:r:" option; do
    case $option in
    c) cosmosAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $cosmosAccountName ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

dbName="scanner2"
createCosmosDatabase "$dbName" "$cosmosAccountName" "$resourceGroupName"
createCosmosCollection "a11yIssues" "$dbName" "$cosmosAccountName" "$resourceGroupName"
createCosmosCollection "webPagesToScan" "$dbName" "$cosmosAccountName" "$resourceGroupName"
