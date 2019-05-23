#!/bin/bash
# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export subscription
export appInsightsKey

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id>
"
    exit 1
}

# Read script arguments
while getopts "r:s:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

az extension add -n application-insights

export resourceName
resources=$(az group deployment create \
    --subscription "$subscription" \
    --resource-group "$resourceGroupName" \
    --template-file "${0%/*}/../templates/app-insights.template.json" \
    --query "properties.outputResources[].id" \
    -o tsv)

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.insights/components" -r "$resources"
appInsightsName=$resourceName

appInsightsKey=$(az monitor app-insights component show --app "$appInsightsName" --resource-group "$resourceGroupName" --query "instrumentationKey" -o tsv)
echo "App Insights Key fetched - $appInsightsKey"
