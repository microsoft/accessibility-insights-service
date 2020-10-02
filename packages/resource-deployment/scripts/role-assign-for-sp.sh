#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create a new role assignment for a service principal

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -p <service principal id>
"
    exit 1
}

# Read script arguments
while getopts ":r:p:o:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $principalId ]]; then
    exitWithUsageInfo
fi

grantRoleToResource() {
    local role=$1
    local scope=$2
    local end=$((SECONDS + 300))

    echo "Create '$role' role assignment for service principal $principalId in $scope"
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        response=$(az role assignment create --role "$role" --assignee-object-id "$principalId" --assignee-principal-type ServicePrincipal $scope --query "roleDefinitionId") || true
        if [[ -n $response ]]; then
            break
        else
            printf "."
        fi

        sleep 5
    done
    echo "  ended"

    if [[ -z $response ]]; then
        echo "Unable to create '$role' role assignment for service principal $principalId in $scope"
        exit 1
    fi

    echo "Successfully granted '$role' role for service principal $principalId in $scope"
}

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

. "${0%/*}/get-resource-names.sh"

grantRoleToResource "Contributor" "--resource-group $resourceGroupName"

blob="/subscriptions/$subscription/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName"
grantRoleToResource "Storage Blob Data Contributor" "--scope $blob"
