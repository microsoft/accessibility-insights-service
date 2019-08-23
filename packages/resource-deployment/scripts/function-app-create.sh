#!/bin/bash
set -euo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -s <subscription name or id> -r <resource group> -l <location>
"
    exit 1
}

export subscription=""
export resourceGroupName=""
export location=""
export functionAppName
export appInsightsName
export storageAccountName

# Set default ARM Function App template files
templateFilePath="../templates/function-app-template.json"

# Read script arguments
while getopts "s:r:l:"  option; do
    case $option in
		s) subscription=${OPTARG} ;;
		r) resourceGroupName=${OPTARG} ;;
		l) location=${OPTARG} ;;
		*) exitWithUsageInfo ;;
		esac
done

if [ -z "$subscription" ] || [ -z "$resourceGroupName" ] || [ -z "$location" ]; then
	echo "Either one of subscription, resourceGroupName or location is empty"
	exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

#set the default subscription id
az account set --subscription $subscription

#Check for existing RG
if [ $(az group exists --name $resourceGroupName) = false ]; then
	echo "Resource group with name" $resourceGroupName "could not be found. Creating new resource group.."
	az group create --name $resourceGroupName --location $location 1> /dev/null
	echo "Resource group has been successfully created"
else
	echo "Using existing resource group..."
fi

#Start deployment
echo "Deploying Function App using ARM template"
export resourceName
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --query "properties.outputResources[].id" \
    -o tsv)


. "get-resource-name-from-resource-paths.sh" -p "Microsoft.Web/sites" -r "$resources"
functionAppName=$resourceName
echo "Successfully deployed Function App '$functionAppName'"

. "get-resource-name-from-resource-paths.sh" -p "Microsoft.Storage/storageAccounts" -r "$resources"
storageAccountName=$resourceName
echo "Successfully created Storage Account '$storageAccountName'"

. "get-resource-name-from-resource-paths.sh" -p "microsoft.insights/components" -r "$resources"
appInsightsName=$resourceName
echo "Successfully created Application Insights '$appInsightsName'"
