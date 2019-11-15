#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

deployResource() {
    local templateName=$1
    echo "Deploying with resource parameters: Resource = $resourceGroupName, Template = $templateName, API Instance = $apiManagementName"
    az group deployment create --resource-group "$resourceGroupName" --template-file "$templateName" --parameters apimServiceName="$apiManagementName" 1>/dev/null
    echo "  Completed"
}

deployResourceWithFunctionName() {
    local templateName=$1
    echo "Deploying with resource parameters: Resource = $resourceGroupName, Template = $templateName, API Instance = $apiManagementName"
    az group deployment create --resource-group "$resourceGroupName" --template-file "$templateName" --parameters functionName="$webApiFuncAppName" apimServiceName="$apiManagementName" 1>/dev/null
    echo "  Completed"
}

exitWithUsageInfo() {
    echo "
Usage: $0 -a <API management name> -t <Template Location> -r <resource group> -f <function app name>
    where 
    API management name - The target API Managment instance name.
    Template location - The location for the templates.
    Resource group - The resource group that the REST API needs to be deployed to.
    Function app name - The backed for the apis.
"
    exit 1
}

# Read script arguments
while getopts ":a:f:r:t:" option; do
    case $option in
    a) apiManagementName=${OPTARG} ;;
    f) webApiFuncAppName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    t) apiTemplates=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $apiManagementName ]] || [[ -z $apiTemplates ]] || [[ -z $resourceGroupName ]] || [[ -z $webApiFuncAppName ]]; then
    exitWithUsageInfo
fi

echo "Starting deployment for REST api..."

echo "Deploying named values"
deployResource "$apiTemplates/model-namedValues.template.json"

echo "Deploying api version sets"
deployResource "$apiTemplates/model-apiVersionSets.template.json"

echo "Deploying products"
deployResource "$apiTemplates/model-products.template.json"

echo "Deploying Loggers"
deployResource "$apiTemplates/model-loggers.template.json"

echo "Deploying backends"
deployResourceWithFunctionName "$apiTemplates/model-backends.template.json"

echo "Deploying authorization servers"
deployResource "$apiTemplates/model-authorizationServers.template.json"

echo "Deploying api"
deployResourceWithFunctionName "$apiTemplates/model-accessibility-insight-service-scan-api-api.template.json"
