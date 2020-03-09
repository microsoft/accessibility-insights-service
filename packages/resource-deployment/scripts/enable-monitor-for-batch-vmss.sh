#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export configureMonitoreForVmssTemplateFile="${0%/*}/../templates/configure-vmss-insights.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -v <vmss name> -r <vmss resource group> -l <vmss location> -p <batch pool>
"
    exit 1
}

waitForNodesToStart() {
    local hasStarted=false
    local nodeType=$1
    local waitTime=900
    local nodeTypeContentSelector="[?poolId=='$pool']|[0].$nodeType"

    echo "Waiting for $nodeType nodes under $pool to start"

    local endTime=$((SECONDS + waitTime))
    printf " - Running .."
    while [ $SECONDS -le $endTime ]; do
        local idleCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.idle" \
                                -o tsv
                            )
        local runningCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.running" \
                                -o tsv
                            ) 
        local startTaskFailedCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.startTaskFailed" \
                                -o tsv
                            ) 

        local totalCount=$(az batch pool node-counts list \
                                --query "$nodeTypeContentSelector.total" \
                                -o tsv
                            ) 
        
        local stableCount=$(( $idleCount + $runningCount +  $startTaskFailedCount ))

        if [[ $stableCount == $totalCount ]]; then
            echo "Nodes under $nodeType for pool: $pool under  has started."
            hasStarted=true
            break;
        else
            printf "."
            sleep 5
        fi
    done

    echo "Currrent Pool Status $pool for $nodeType:"
    az batch pool node-counts list --query "$nodeTypeContentSelector"
    
    if [[ $hasStarted == false ]]; then
        echo "Pool $pool & $nodeType is not in the expected state."
        exit 1
    fi
}

waitForPoolNodesToStart() {
    waitForNodesToStart "dedicated"
    waitForNodesToStart "lowPriority"
}

enableAzureMonitor() {
    # Wait for nodes to start to avoid any lock / communication issues
    local resources

    waitForPoolNodesToStart

    echo "Enabling azure monitor on $vmssName for pool $pool"
    
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
    echo "Successfully Enabled Azure Monitor on $vmssName under pool $pool"
}

# Read script arguments
while getopts ":v:r:p:" option; do
    case $option in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    l) vmssLocation=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

echo "
Enabling monitor for vmss:
vmssName:$vmssName
vmssResourceGroup:$vmssResourceGroup
vmssLocation:$vmssLocation
pool:$pool
"
if [[ -z $vmssName ]] || [[ -z $vmssResourceGroup ]] || [[ -z $vmssLocation ]] || [[ -z $pool ]]; then
    exitWithUsageInfo
fi

enableAzureMonitor
