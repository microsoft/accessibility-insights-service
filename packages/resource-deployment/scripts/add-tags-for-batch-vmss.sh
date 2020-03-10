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

addTagToVmss() {
    tagName="$1"
    tagValue="$2"

    az resource update \
        --set tags.$tagName="$tagValue" \
        -g "$vmssResourceGroup" \
        -n "$vmssName" \
        --resource-type "Microsoft.Compute/virtualMachineScaleSets" \
        --query "tags" \
        -o tsv

    echo "Tag $tagName=$tagValue was added to $vmssName vmss under $vmssResourceGroup resource group"
}

addResourceGroupNameTagToVMSS(){
  
    addTagToVmss "ResourceGroupName" "$resourceGroupName"

    local vmssCreatedTime=$(az vmss show \
                                --name "$vmssName" \
                                --resource-group "$vmssResourceGroup" \
                                --query "tags.VmssCreatedDate" \
                                -o tsv
                           )
    if [[ -z $vmssCreatedTime ]]; then
        local currentTime=$(date "+%Y-%m-%d")
        addTagToVmss "VmssCreatedDate" "$currentTime"
    fi
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

. "${0%/*}/get-resource-names.sh"

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
