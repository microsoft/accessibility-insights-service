#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group>
"
    exit 1
}

# Read script arguments
while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

function waitForDeployments {
    local pendingDeploymentsQuery="az deployment group list \
                                --resource-group "$resourceGroupName" \
                                --query \"[?properties.provisioningState=='Running'].name\" \
                                -o tsv"

    local pendingDeployments=$(eval "$pendingDeploymentsQuery")

    if [[ -n $pendingDeployments ]]; then
        local noPendingDeployments=false
        local maximumWaitTimeInSeconds=120
        local end=$((SECONDS + maximumWaitTimeInSeconds))

        echo "There are pending deployments:
                deployments: $pendingDeployments
                Waiting for the deployments to complete."
        
        while [[ $SECONDS -le $end ]] && [[ $noPendingDeployments == false ]]; do
            pendingDeployments=$(eval "$pendingDeploymentsQuery")
            if [[ -z $pendingDeployments ]]; then
                noPendingDeployments=true
            fi

            if [[ $noPendingDeployments == false ]]; then
                printf '.'
                sleep 5
            fi
        done 

        if [[ $noPendingDeployments == false ]]; then 
            echo "There are still pending deployments after the maximum wait time of $maximumWaitTimeInSeconds seconds.
                deployments: $pendingDeployments
            "
            exit 1
        else
            echo "
            All Pending deployments are completed.
            "
        fi
    else
        echo "There are no pending deployments."
    fi
}

waitForDeployments
