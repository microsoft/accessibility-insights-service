#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

deployResource() {
    local templateName=$1
    echo "Deploying with resource parameters: Resource = $resourceGroupName, Template = $templateName, API Instance = $apiManagementName"
    az deployment group create --resource-group "$resourceGroupName" --template-file "$templateName" --parameters apimServiceName="$apiManagementName" 1>/dev/null
    echo "  Completed"
}

deployResourceWithFunctionName() {
    local templateName=$1
    echo "Deploying with resource parameters: Resource = $resourceGroupName, Template = $templateName, API Instance = $apiManagementName"
    az deployment group create --resource-group "$resourceGroupName" --template-file "$templateName" --parameters functionName="$webApiFuncAppName" apimServiceName="$apiManagementName" 1>/dev/null
    echo "  Completed"
}

exitWithUsageInfo() {
    echo "
Usage: $0 -t <Template Location> -r <resource group>
    where 
    Template location - The location for the templates.
    Resource group - The resource group that the REST API needs to be deployed to.
"
    exit 1
}

# Read script arguments
while getopts ":r:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) apiTemplates=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

if [[ -z $apiTemplates ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

echo "Starting deployment for REST api..."

echo "Deploying products"
deployResource "$apiTemplates/model-products.template.json"

echo "Deploying backends"
deployResourceWithFunctionName "$apiTemplates/model-backends.template.json"

echo "Deploying api"
deployResourceWithFunctionName "$apiTemplates/model-accessibility-insight-service-scan-api-api.template.json"
