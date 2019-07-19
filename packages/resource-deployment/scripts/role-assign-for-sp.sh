#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create a new role assignment for a service principal

role="Contributor"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -p <service principal id> -o <role name or id (optional), defaults to the '$role' role>
"
    exit 1
}

# Read script arguments
while getopts "r:p:o:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    p) principalId=${OPTARG} ;;
    o) role=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $principalId ]] || [[ -z $role ]]; then
    exitWithUsageInfo
fi

echo "Granting role '$role' to the resource group '$resourceGroupName' for service principal '$principalId'"

end=$((SECONDS + 300))
printf " - Running .."
while [ $SECONDS -le $end ]; do
    response=$(az role assignment create --role "$role" --resource-group "$resourceGroupName" --assignee-object-id "$managedIdentity" --query "roleDefinitionId") || true

    if [[ -n $response ]]; then	
            break	
    else	
        echo "Retry count - $i."	
    fi	
        sleep 5
done
echo "  ended"

if [[ -z $response ]]; then
    echo "Unable to create role assignment '$role' for service principal '$principalId'"

    exit 1
fi

echo "Successfully granted role '$role' to the resource group '$resourceGroupName' for service principal '$principalId'"
