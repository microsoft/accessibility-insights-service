#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export logAnalyticsWorkspaceId
export resourceName

# Set default ARM template file
logAnalyticsTemplateFile="${0%/*}/../templates/log-analytics-workspace.template.json"

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

echo "Deploy using ARM template for setting up log analytics workspace"
resources=$(
    az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$logAnalyticsTemplateFile" \
        --query "properties.outputResources[].id" \
        -o tsv
)

echo "Successfully Deployed log analytics workspace. 
        Created Resources - $resources"
