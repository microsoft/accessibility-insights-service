#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export location

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -l <Azure region>

List of available Azure regions:

centralus
eastasia
southeastasia
eastus
eastus2
westus
westus2
northcentralus
southcentralus
westcentralus
northeurope
westeurope
japaneast
japanwest
brazilsouth
australiasoutheast
australiaeast
westindia
southindia
centralindia
canadacentral
canadaeast
uksouth
ukwest
koreacentral
koreasouth
francecentral
southafricanorth
uaenorth
"
    exit 1
}

# Read script arguments
while getopts ":r:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $location ]]; then
    exitWithUsageInfo
fi

resourceGroupExistsQuery="az group exists -n $resourceGroupName"
resourceGroupExists=$($resourceGroupExistsQuery)

if [ "$resourceGroupExists" = false ]; then
    echo "Creating resource group $resourceGroupName under $location"
    az group create --name "$resourceGroupName" --location "$location" 1>/dev/null
else
    echo "Resource group $resourceGroupName already exists"
fi

resourceGroupExists=$($resourceGroupExistsQuery)
# Wait until we are certain the resource group exists
waiting=false
timeout=600 # timeout after ten minutes
end=$((SECONDS + $timeout))
while [ "$resourceGroupExists" = false ] && [ $SECONDS -le $end ]; do
    if [ "$waiting" != true ]; then
        waiting=true
        echo "Waiting for resource group $resourceGroupName"
        printf " - Running .."
    fi

    sleep 5
    printf "."
    resourceGroupExists=$($resourceGroupExistsQuery)
done

# Exit if timed out
if [ "$resourceGroupExists" = false ]; then
    echo "Could not find resource group $resourceGroupName after $timeout seconds"
    exit 1
fi
