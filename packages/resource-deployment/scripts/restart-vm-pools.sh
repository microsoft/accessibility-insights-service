#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export subscription

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id>
"
    exit 1
}

getBatchAccountName() {
    declare -n refResult=$1

    echo "Fetching batch account name under resource group $resourceGroupName"
    # shellcheck disable=SC2034
    refResult=$(az batch account list --resource-group "$resourceGroupName" --subscription "$subscription" --query "[0].name" -o tsv)
    echo "found batch account name - $refResult"
}

restartBatchPools() {
    local batchAccountName
    getBatchAccountName batchAccountName

    echo "querying for vm scalesets resource groups of batch account $batchAccountName"
    local query="[?tags.BatchAccountName=='$batchAccountName']"
    vmssResourceGroupNames=$(az vmss list --subscription "$subscription" --query "$query.[resourceGroup]" -o tsv)

    for vmssResourceGroupName in $vmssResourceGroupNames; do
        local name

        echo "querying for vm scaleset name under resource group $vmssResourceGroupName"
        name=$(az vmss list --subscription "$subscription" --resource-group "$vmssResourceGroupName" --query "$query.[name]" -o tsv)

        echo "restarting vm scaleset $name under resource group $vmssResourceGroupName"
        az vmss restart --name "$name" --resource-group "$vmssResourceGroupName" --subscription "$subscription"
    done
}

# Read script arguments
while getopts "r:s:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]]; then
    exitWithUsageInfo
fi

restartBatchPools
