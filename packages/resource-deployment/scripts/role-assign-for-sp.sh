#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create a new role assignment for a service principal

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -p <service principal id> -g <Azure role name or id> -s <scope at which the role assignment applies to>
"
    exit 1
}

# Read script arguments
while getopts ":r:p:o:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    g) role=${OPTARG} ;;
    s) scope=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $principalId ]] || [[ -z $role ]] || [[ -z $scope ]]; then
    exitWithUsageInfo
fi

grantRoleToResource() {
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

grantRoleToResource
