#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

deployRestApi() {
    local templateName="$templatesFolder/model-accessibility-insight-service-scan-api-api.template.json"
    echo "Deploying REST API template with resource parameters: Resource = $resourceGroupName, API Instance = $apiManagementName"
    az deployment group create --resource-group "$resourceGroupName" --template-file "$templateName" --parameters functionName="$webApiFuncAppName" e2eFunctionName="$e2eWebApisFuncAppName" apimServiceName="$apiManagementName" 1>/dev/null
    echo "  Completed"
}

restrictWebApiAccess() {
    echo "Restricting function app access to APIM IP address"
    apimIpAddress=$(az apim show --name "$apiManagementName" --resource-group "$resourceGroupName" --query "publicIpAddresses" -o tsv)
    result=$(az functionapp config access-restriction remove -g "$resourceGroupName" \
        -n "$webApiFuncAppName" \
        --rule-name "APIM" \
        --action "Allow" \
        --ip-address "$apimIpAddress") || echo "Error while removing function app network rule"

    result=$(az functionapp config access-restriction add -g "$resourceGroupName" \
        -n "$webApiFuncAppName" \
        --rule-name "APIM" \
        --action "Allow" \
        --ip-address "$apimIpAddress" \
        --priority 100) || echo "Error while adding function app network rule"
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
    t) templatesFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

if [[ -z $templatesFolder ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/process-utilities.sh"

restApiProcesses=(
    "deployRestApi"
    "restrictWebApiAccess"
)

runCommandsWithoutSecretsInParallel restApiProcesses
