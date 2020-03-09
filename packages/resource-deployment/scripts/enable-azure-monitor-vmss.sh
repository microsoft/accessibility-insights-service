#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# export vmssResourceGroups
# export systemAssignedIdentities

export resourceGroupName
export logAnalyticsWorkspaceId
export vmssResourceGroup
export vmssName
export vmssLocation
export configureMonitoreForVmssTemplateFile="${0%/*}/../templates/configure-vmss-insights.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -g <vmss resource group> -v <vmss name> -w <log analytics workspace Id> -l <vmss location>
"
    exit 1
}


while getopts ":r:g:v:w:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    g) vmssResourceGroup=${OPTARG} ;;
    v) vmssName=${OPTARG} ;;
    w) logAnalyticsWorkspaceId=${OPTARG} ;;
    l) vmssLocation=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $vmssResourceGroup ]] || [[ -z $vmssName ]] || [[ -z $vmssLocation ]] || [[ -z $logAnalyticsWorkspaceId ]]; then
    exitWithUsageInfo
fi

enableAzureMonitor() {
    local logAnalyticsWorkspaceKey
    local result

    echo "Enabling azure monitor on $vmssName"
    resources=$(
        az group deployment create \
            --resource-group "$vmssResourceGroup" \
            --template-file "$configureMonitoreForVmssTemplateFile" \
            --parameters VmssName="$vmssName" WorkspaceName="$logAnalyticsWorkspaceId" VmssLocation="$vmssLocation" WorkspaceResourceGroup="$resourceGroupName" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Created resources for vmss $vmssName & pool $pool:
         resources: $resources
    "
    echo "Successfully Enabled Azure Monitor on $vmssName"
}

enableAzureMonitor
