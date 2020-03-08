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

    # logAnalyticsWorkspaceKey=$(
    #     az monitor log-analytics workspace get-shared-keys \
    #             --resource-group "$resourceGroupName" \
    #             --workspace-name "$logAnalyticsWorkspaceId" \
    #             --query primarySharedKey \
    #             -o tsv
    # )

    # logAnalyticsWorkspaceCustomerId=$(
    #     az monitor log-analytics workspace show \
    #             --resource-group "$resourceGroupName" \
    #             --workspace-name "$logAnalyticsWorkspaceId" \
    #             --query customerId \
    #             -o tsv
    # )

    # echo "Enabling OmsAgentForLinux extension on $vmssName"
    # result=$(
    #     az vmss extension set \
    #         --resource-group "$vmssResourceGroup" \
    #         --vmss-name "$vmssName" \
    #         --name OmsAgentForLinux \
    #         --publisher Microsoft.EnterpriseCloud.Monitoring \
    #         --protected-settings "{\"workspaceKey\":\"$logAnalyticsWorkspaceKey\"}" \
    #         --settings "{\"workspaceId\":\"$logAnalyticsWorkspaceCustomerId\"}" \
    #         -o tsv \
    #         --query "virtualMachineProfile.extensionProfile.extensions[?type=='OmsAgentForLinux'].type|[0]"
    #     )

    # if [ "$result" != "OmsAgentForLinux" ]; then
    #     echo "Unable to enable OmsAgentForLinux on vmss $vmssName"
    #     exit 1
    # fi

    # sleep 60

    # echo "Enabling DependencyAgentLinux extension on $vmssName"
    # result=$(
    #     az vmss extension set \
    #     --resource-group "$vmssResourceGroup" \
    #     --vmss-name "$vmssName" \
    #     --name DependencyAgentLinux \
    #     --force-update \
    #     --publisher Microsoft.Azure.Monitoring.DependencyAgent \
    #     -o tsv \
    #     --query "virtualMachineProfile.extensionProfile.extensions[?type=='DependencyAgentLinux'].type|[0]"
    # )

    # if [ "$result" != "DependencyAgentLinux" ]; then
    #     echo "Unable to enable DependencyAgentLinux on vmss $vmssName"
    #     exit 1
    # fi

    echo "Successfully Enabled Azure Monitor on $vmssName"
}

enableAzureMonitor
