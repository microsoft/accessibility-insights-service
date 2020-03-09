#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

# export vmssResourceGroups
# export systemAssignedIdentities

# Set default ARM template file
configureMonitoreForVmssTemplateFile="${0%/*}/../templates/configure-vmss-insights.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -a <batch account> -p <batch pool> -w <log analytics workspace Id> -k <kevault name>
"
    exit 1
}

getPoolNodeCount() {
    echo "Retrieving information about the '$pool' Batch pool"

    dedicatedNodes=$(az batch pool show --pool-id "$pool" --query "targetDedicatedNodes" -o tsv)
    lowPriorityNodes=$(az batch pool show --pool-id "$pool" --query "targetLowPriorityNodes" -o tsv)
    poolNodeCount=$((dedicatedNodes + lowPriorityNodes))
    echo "  Pool nodes total $poolNodeCount"
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

getVmssInfo() {
    echo "Retrieving information about the '$pool' Batch pool VMSS resources"

    # Azure Batch hosts up to 50 nodes on a single VMSS resource
    # Calculate expected number of VMSS resources
    maxNodeCount=50
    vmssCount=$(((poolNodeCount + maxNodeCount - 1) / maxNodeCount))
    echo "  Pool VMSS resources total $vmssCount"

    vmssResourceGroupsQuery="[?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName'].resourceGroup"

    waiting=false
    end=$((SECONDS + 600))
    while [ $SECONDS -le $end ]; do
        vmssResourceGroupsStr=$(az vmss list --query "$vmssResourceGroupsQuery" -o tsv | tr "\n" ",")
        IFS=$',' read -ra vmssResourceGroups <<<"$vmssResourceGroupsStr"
        currentVmssCount=$((${#vmssResourceGroups[@]}))

        if [ $currentVmssCount -ge $vmssCount ]; then
            break
        fi

        if [ "$waiting" != true ]; then
            waiting=true
            echo "Waiting for the '$pool' Batch pool VMSS resources deployment"
            printf " - Running .."
        fi

        sleep 5
        printf "."
    done
    [ "$waiting" = true ] && echo " ended"

    # Validate result if timed out
    if [ $currentVmssCount -lt $vmssCount ]; then
        echo "The '$batchAccountName' Azure Batch account has no VMSS resources deployed for the '$pool' Batch pool"
        exit 1
    fi

    echo \
        "VMSS resource groups:"

    for vmssResourceGroup in "${vmssResourceGroups[@]}"; do
        echo "  $vmssResourceGroup"
    done
    echo ""
}

assignSystemIdentity() {
    local vmssResourceGroup=$1
    local vmssName=$2

    principalId=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)
    systemAssignedIdentities+=("$principalId")

    echo \
        "VMSS Resource configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $principalId
  "
    
    . "${0%/*}/key-vault-enable-msi.sh"
    . "${0%/*}/role-assign-for-sp.sh"
}

enableAzureMonitor() {
    local vmssResourceGroup=$1
    local vmssName=$2
    local vmssLocation=$3

    # Wait for nodes to start to avoid any lock / communication issues
    waitForPoolNodesToStart

    echo "Enabling azure monitor on $vmssName for pool $pool"
    command=". ${0%/*}/enable-azure-monitor-vmss.sh"
    maxRetryCount=2
    retryWaitTimeInSeconds=60
    . "${0%/*}/run-with-retry.sh"

    echo "Successfully Enabled Azure Monitor on $vmssName under pool $pool"
}

setupVmss() {
    for vmssResourceGroup in "${vmssResourceGroups[@]}"; do
        echo "Running setup for VMSS resource group $vmssResourceGroup for pool $pool"

        # Wait until we are certain the resource group exists
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "az group exists --name $vmssResourceGroup"

        vmssQueryConditions="?tags.PoolName=='$pool' && tags.BatchAccountName=='$batchAccountName' && resourceGroup=='$vmssResourceGroup'"
        vmssDeployedQuery="[$vmssQueryConditions && provisioningState!='Creating' && provisioningState!='Updating'].name"
        vmssCreatedCommand="az vmss list --query \"$vmssDeployedQuery\" -o tsv"
        
        . "${0%/*}/wait-for-deployment.sh" -n "$vmssResourceGroup" -t "1800" -q "$vmssCreatedCommand"

        vmssName=$(az vmss list --query "[$vmssQueryConditions].name" -o tsv)
        vmssLocation=$(az vmss list --query "[$vmssQueryConditions].location" -o tsv)
       
        echo "Checking vmss status - $vmssName"
        vmssStatus=$(az vmss list --query "[$vmssQueryConditions].provisioningState" -o tsv)
        if [ "$vmssStatus" != "Succeeded" ]; then
            echo "Deployment of vmss $vmssName failed with status $vmssStatus"
            exit 1
        fi

        assignSystemIdentity "$vmssResourceGroup" "$vmssName"

        enableAzureMonitor "$vmssResourceGroup" "$vmssName" "$vmssLocation"

    done
}

# Read script arguments
while getopts ":r:a:p:w:k:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    a) batchAccountName=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    w) logAnalyticsWorkspaceId=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $batchAccountName ]] || [[ -z $pool ]] || [[ -z $logAnalyticsWorkspaceId ]] || [[ -z $keyVault ]]; then
    exitWithUsageInfo
fi

# Validate Azure Batch account for the user subscription pool allocation mode
echo "Validating '$batchAccountName' Azure Batch account configuration"
poolAllocationMode=$(az batch account show --name "$batchAccountName" --resource-group "$resourceGroupName" --query "poolAllocationMode" -o tsv)

if [[ $poolAllocationMode != "UserSubscription" ]]; then
    echo "ERROR: The '$batchAccountName' Azure Batch account with '$poolAllocationMode' pool allocation mode is not supported."
    exit 1
else
    echo "  Valid pool allocation mode $poolAllocationMode"
fi

# Get total pool node count
getPoolNodeCount

# Get Batch pool Azure VMSS resource group and name
getVmssInfo

# Enable system-assigned managed identity on VMSS resources
setupVmss
