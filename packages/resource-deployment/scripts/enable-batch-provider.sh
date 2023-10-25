#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will configure the default Azure subscription account to support Batch user subscription mode

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -b <Azure Batch object ID> [-k <key vault>] [-s <subscription name or id>]
"
    exit 1
}

# Read script arguments
while getopts ":s:r:k:b:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $azureBatchObjectId ]]; then
    exitWithUsageInfo
fi

if [[ -z $subscription ]] || [[ -z $keyVault ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

echo "Validating Microsoft.Batch provider registration on $subscription Azure subscription"
batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)

# Register Microsoft.Batch provider on Azure subscription
if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "Registering Microsoft.Batch provider on $subscription Azure subscription"
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
    echo "ERROR: Unable to register Microsoft.Batch provider on $subscription Azure subscription. Check Azure subscription resource providers state."
fi

# Grant subscription permission to Azure Batch service
roleDefinitionName=$(az role assignment list --query "[?principalId=='$azureBatchObjectId'].roleDefinitionName" -o tsv)
if [[ $roleDefinitionName != "Contributor" ]]; then
    echo "Granting Azure Batch service permissions to the $subscription Azure subscription"
    az role assignment create --assignee ddbf3205-c6bd-46ae-8127-60eb93363864 --role contributor 1>/dev/null
fi

# Grant Key Vault permission to Azure Batch service
echo "Granting Azure Batch service permissions to the $keyVault key vault"
az role assignment create \
    --role "Key Vault Secrets Officer" \
    --assignee "$azureBatchObjectId" \
    --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName/providers/Microsoft.KeyVault/vaults/$keyVault" 1>/dev/null
