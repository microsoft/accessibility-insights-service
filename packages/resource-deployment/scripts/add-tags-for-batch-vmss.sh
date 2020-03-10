#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -v <vmss name> -r <vmss resource group> -b <batch resource group name>
"
    exit 1
}

addResourceGroupNameTagToVMSS(){
    az resource update --set tags.ResourceGroupName="$resourceGroupName" -g "$vmssResourceGroup" -n "$vmssName" --resource-type "Microsoft.Compute/virtualMachineScaleSets"

    echo "Tag ResourceGroupName=$resourceGroupName was added to $vmssName vmss under $vmssResourceGroup resource group"
}

# Read script arguments
while getopts ":v:r:b:" option; do
    case $option in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    b) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/set-resource-names.sh"

echo "
Assigning Tag for:
vmssName:$vmssName
vmssResourceGroup:$vmssResourceGroup
resourceGroupName: $resourceGroupName
"
if [[ -z $vmssName ]] || [[ -z $vmssResourceGroup ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

addResourceGroupNameTagToVMSS
