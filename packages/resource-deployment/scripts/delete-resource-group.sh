#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName

exitWithUsageInfo() {
    echo "
        Usage: $0 -r <resource group name> [-p <purge key vault if set to true>]
    "
    exit 1
}

deleteResourceGroup() {
    local resourceGroupName=$1
    local response

    response=$(az group exists --name "$resourceGroupName")

    if [[ "$response" == true ]]; then
        echo "Resource group $resourceGroupName exists."

        . "${0%/*}/get-resource-names.sh"

        deleteApimIfExists

        echo "Triggering delete operation on resource group $resourceGroupName"

        response=$(az group delete --name "$resourceGroupName" --yes)
        if [[ -z $response ]]; then
            echo "$resourceGroupName - Resource group deleted."
        else
            echo "Unable to delete resource group $resourceGroupName. Response - $response"
            exit 1
        fi

        if [[ "$purgeKeyVault" == true ]]; then
            purgeKeyvaultIfSoftDeleted
        else
            echo "Keyvault $keyVault was not purged and will be recoverable for 90 days."
        fi
    else
        echo "$resourceGroupName - Does not exist."
    fi
}

deleteApimIfExists() {
    apimExistsCommand="az apim list --resource-group $resourceGroupName --query \"[?name=='$apiManagementName']\" -o tsv"
    apimExists=$(eval "$apimExistsCommand")

    if [[ -n "$apimExists" ]]; then
        echo "Deleting API Management $apiManagementName..."
        az apim delete --name $apiManagementName --resource-group $resourceGroupName --yes || true

        # Wait for APIM to delete
        local waiting=false
        local deleteTimeout=1200
        local end=$((SECONDS + $deleteTimeout))
        apimExists=$(eval "$apimExistsCommand")
        while [[ -n "$apimExists" ]] && [ $SECONDS -le $end ]; do
            if [[ $waiting != true ]]; then
                waiting=true
                echo "Waiting for $apiManagementName to delete"
                printf " - Running .."
            fi

            sleep 5
            printf "."
            apimExists=$(eval "$apimExistsCommand")
        done

        if [[ -n "$apimExists" ]]; then
            echo "Unable to delete API Management instance $apiManagementName within $deleteTimeout seconds"
            exit 1
        fi

        echo "$apiManagementName successfully deleted"
    fi
}

purgeKeyvaultIfSoftDeleted() {
    response=$(az keyvault list-deleted --resource-type vault --query "[?name=='$keyVault'].id" -o tsv)

    if [[ -n "$response" ]]; then
        echo "Purging keyvault $keyVault..."
        az keyvault purge --name "$keyVault" || true
    fi
}

# Read script arguments
while getopts ":r:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) purgeKeyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

deleteResourceGroup "$resourceGroupName"
