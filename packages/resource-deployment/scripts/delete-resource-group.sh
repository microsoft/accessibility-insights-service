#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
        Usage: $0 -r <resource group name>
    "
    exit 1
}

deleteResourceGroup() {
    local resourceGroupName=$1
    local response

    response=$(az group exists --name "$resourceGroupName")

    if [[ "$response" == true ]]; then
        echo "Resource group $resourceGroupName exists."

        deleteApimIfExists

        echo "Triggering delete operation on resource group $resourceGroupName"

        response=$(az group delete --name "$resourceGroupName" --yes)
        if [[ -z $response ]]; then
            echo "$resourceGroupName - Resource group deleted."
        else
            echo "Unable to delete resource group $resourceGroupName. Response - $response"
            exit 1
        fi
    else
        echo "$resourceGroupName - Does not exist."
    fi
}

deleteApimIfExists() {
    . "${0%/*}/get-resource-names.sh"

    response=$(az apim show --name $apiManagementName --resource-group $resourceGroupName -o tsv)

    if [[ -n "$response" ]]; then
        echo "Deleting API Management $apiManagementName"
        az apim delete --name $apiManagementName --resource-group $resourceGroupName --yes || true
    fi
}

# Read script arguments
while getopts ":r:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

deleteResourceGroup "$resourceGroupName"
