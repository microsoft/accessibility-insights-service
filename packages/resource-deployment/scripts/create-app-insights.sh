#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export subscription

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription name or id>]
"
    exit 1
}

# Read script arguments
while getopts ":r:s:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Installing microsoft.insights Azure CLI extension"
az extension add -n application-insights 1>/dev/null

echo "Creating Log Analytics workspace"
az monitor log-analytics workspace create --resource-group "${resourceGroupName}" --workspace-name "${workspaceName}" 1>/dev/null

echo "Creating Application Insights resource using ARM template"
export resourceName
resources=$(az deployment group create \
    --subscription "${subscription}" \
    --resource-group "${resourceGroupName}" \
    --template-file "${0%/*}/../templates/app-insights.template.json" \
    --query "properties.outputResources[].id" \
    -o tsv)

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.insights/components" -r "${resources}"
appInsightsName=${resourceName}

# The servicePrincipalId is Azure DevOps service connection application (client) id used by release pipeline.
# Set by Azure DevOps environment. Task option 'Access service principal details in script' should be enabled.
if [[ -n ${servicePrincipalId} ]]; then
    principalId=${servicePrincipalId}
    role="Reader"
    scope="--scope /subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/microsoft.insights/components/${appInsightsName}"
    . "${0%/*}/create-role-assignment.sh"
    echo "Added role assignment to Application Insights resource for Azure DevOps service connection with application (client) ID ${servicePrincipalId}"
fi

echo "Successfully created Application Insights ${appInsightsName}"
