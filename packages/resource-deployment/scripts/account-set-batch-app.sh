#!/bin/bash
set -eo pipefail

# The script will configure the default Azure subscription account to support Batch user subscription mode

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

echo "Validating Microsoft.Batch provider registration on '$subscription' Azure subscription"
batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)

# Register Microsoft.Batch provider on Azure subscription
if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "Registering Microsoft.Batch provider on '$subscription' Azure subscription"
    az provider register --namespace Microsoft.Batch

    # Wait for the registration to complete
    end=$((SECONDS+300))
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
#   Object ID: f520d84c-3fd3-4cc8-88d4-2ed25b00d27a
principalId=$(az role assignment list --query "[?principalId=='f520d84c-3fd3-4cc8-88d4-2ed25b00d27a'].roleDefinitionName" -o tsv)
if [[ $principalId != "Contributor" ]]; then
    echo "Granting Azure Batch service access to the '$subscription' Azure subscription"
    az role assignment create --assignee ddbf3205-c6bd-46ae-8127-60eb93363864 --role contributor 1> /dev/null
fi
