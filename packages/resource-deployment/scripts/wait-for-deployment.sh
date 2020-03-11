#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export location

exitWithUsageInfo() {
    echo "
Usage: $0 -n <resource name> -t <max wait time> [-r <resource group> | -q <existance query>] 
"
    exit 1
}

# Read script arguments
previousFlag=""
for arg in "$@"; do
    case $previousFlag in
    -n) resourceName=$arg ;;
    -t) timeout=$arg ;;
    -r) resourceGroupName=$arg ;;
    -q) existanceQuery=$arg ;;
    -?) exitWithUsageInfo ;;
    esac
    previousFlag=$arg
done

if [ -z "$resourceName" ] || [ -z "$timeout" ]; then
    exitWithUsageInfo
fi

if [ -z "$existanceQuery" ]; then
    if [ -z $resourceGroupName ]; then
        echo "Must specify either resource group or a custom query."
        exitWithUsageInfo
    else
        existanceQuery="az resource list --name $resourceName --resource-group $resourceGroupName -o tsv"
    fi
fi

resourceExists=$(eval "$existanceQuery")
# Wait until we are certain the resource group exists
waiting=false
end=$((SECONDS + $timeout))
while ([ -z "$resourceExists" ] || [ "$resourceExists" = false ]) && [ $SECONDS -le $end ]; do
    if [ "$waiting" != true ]; then
        waiting=true
        echo "Waiting for $resourceName"
        printf " - Running .."
    fi

    sleep 5
    printf "."
    resourceExists=$(eval "$existanceQuery")
done

# Exit if timed out
if [[ -z $resourceExists ]] || [[ $resourceExists = false ]]; then
    echo "Could not find resource $resourceName after $timeout seconds"
    exit 1
fi
