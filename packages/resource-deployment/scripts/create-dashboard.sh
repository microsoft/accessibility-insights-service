#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Set default ARM Batch account template files
dashboardTemplateFile="${0%/*}/../templates/dashboard.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-t <dashboard template file (optional)>]
"
    exit 1
}

# Read script arguments
while getopts ":r:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) dashboardTemplateFile=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $dashboardTemplateFile ]]; then
    exitWithUsageInfo
fi

# Deploy Azure dashboard using resource manager template
echo "Deploying dashboard in resource group $resourceGroupName with template $dashboardTemplateFile"
resources=$(
    az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$dashboardTemplateFile" \
        --query "properties.outputResources[].id" \
        -o tsv
)
