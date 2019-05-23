#!/bin/bash
set -eo pipefail

exitWithUsageInfo() {
    echo "
        Usage: $0 -r <resource group name>
    "
    exit 1
}

deleteResourceGroup()  {
    local resourceGroupName=$1
    local response

    response=$(az group delete --name "$resourceGroupName" --yes)
    if [[ -z $response ]]; then
        echo "$resourceGroupName - Resource group deleted."
    else
        echo "Something went wrong. Response - $response"
        exit 1
    fi
}

# Read script arguments
while getopts "r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

response=$(az group exists --name "$resourceGroupName")

if [[ "$response" == true ]]; then
    deleteResourceGroup "$resourceGroupName"
else 
    echo "$resourceGroupName - Does not exist."
fi