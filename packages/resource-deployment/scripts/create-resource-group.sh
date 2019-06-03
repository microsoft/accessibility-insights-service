#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export location

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -l <location>
"
    exit 1
}

# Read script arguments
while getopts "r:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $location ]]; then
    exitWithUsageInfo
fi

resourceGroupExists=$(az group exists -n "$resourceGroupName")

if [ "$resourceGroupExists" = false ]; then
    echo "Creating resource group $resourceGroupName under $location"

    az group create --name "$resourceGroupName" --location "$location"
else
    echo "Resource group $resourceGroupName already exists"
fi
