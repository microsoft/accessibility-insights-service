#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will configure the default Azure subscription account to support Batch user subscription mode

exitWithUsageInfo() {
    echo "
Usage: $0 -e <environment>
"
    exit 1
}

# Read script arguments
while getopts ":e:" option; do
    case $option in
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $environment ]]; then
    exitWithUsageInfo
fi


# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

echo "Validating Microsoft.Batch provider registration on '$subscription' Azure subscription"
batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)

# Register Microsoft.Batch provider on Azure subscription
if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "Registering Microsoft.Batch provider on '$subscription' Azure subscription"
    az provider register --namespace Microsoft.Batch

    # Wait for the registration to complete
    end=$((SECONDS + 300))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        sleep 10
        printf "."
        batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)
        if [[ $batchProviderRegistrationState == "Registered" ]]; then
            break
        fi
    done
    echo " Registered"
fi

if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "ERROR: Unable to register Microsoft.Batch provider on '$subscription' Azure subscription. Check Azure subscription resource providers state."
fi

# Allow Azure Batch service to access the subscription
#   Name: Microsoft Azure Batch
#   Application ID: ddbf3205-c6bd-46ae-8127-60eb93363864
#   Object ID: 
#               - Microsoft: f520d84c-3fd3-4cc8-88d4-2ed25b00d27a
#               - PME: 8ad17ea0-4c88-4465-b8ec-a827df84f896




# Microsoft directory in case if env is not ppe or prod
objectId='f520d84c-3fd3-4cc8-88d4-2ed25b00d27a'

#PME directory in case if env is ppe or prod
if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
    objectId='8ad17ea0-4c88-4465-b8ec-a827df84f896'
fi


roleDefinitionName=$(az role assignment list --query "[?principalId=='$objectId'].roleDefinitionName" -o tsv)
if [[ $roleDefinitionName != "Contributor" ]]; then
    echo "Granting Azure Batch service access to the '$subscription' Azure subscription"
    az role assignment create --assignee ddbf3205-c6bd-46ae-8127-60eb93363864 --role contributor 1>/dev/null
fi
