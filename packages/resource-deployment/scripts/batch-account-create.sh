#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

export resourceGroupName
export batchAccountName
export pool
export keyVault
export resourceName
export systemAssignedIdentities
export principalId
export enableSoftDeleteOnKeyVault
export logAnalyticsWorkspaceId

# Set default ARM Batch account template files
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-t <batch template file (optional)>] -k <enable soft delete for Azure Key Vault> -w <log analytics workspace Id>
"
    exit 1
}

function waitForProcesses() {
    local processesToWaitFor=$1

    list="$processesToWaitFor[@]"
    for pid in "${!list}"; do
        echo "Waiting for process with pid $pid"
        wait $pid
        echo "Process with pid $pid exited"
    done
}

# Read script arguments
while getopts ":r:t:k:w:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) batchTemplateFile=${OPTARG} ;;
    k) enableSoftDeleteOnKeyVault=${OPTARG} ;;
    w) logAnalyticsWorkspaceId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $enableSoftDeleteOnKeyVault ]] || [[ -z $batchTemplateFile ]] || [[ -z $logAnalyticsWorkspaceId ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

# Configure Azure subscription account to support Batch account in user subscription mode
. "${0%/*}/account-set-batch-app.sh"

# Deploy Azure Batch account using resource manager template
echo "Deploying Azure Batch account in resource group $resourceGroupName with template $batchTemplateFile"
resources=$(
    az group deployment create \
        --resource-group "$resourceGroupName" \
        --template-file "$batchTemplateFile" \
        --query "properties.outputResources[].id" \
        --parameters enableSoftDeleteOnKeyVault="$enableSoftDeleteOnKeyVault" \
        -o tsv
)

# Get key vault and batch account resources
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.KeyVault/vaults" -r "$resources"
keyVault="$resourceName"

. "${0%/*}/push-secrets-to-key-vault.sh"

. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Batch/batchAccounts" -r "$resources"
batchAccountName="$resourceName"

if [[ -z $batchAccountName ]] || [[ -z $keyVault ]]; then
    echo \
        "Unable to get required resource information from Batch account deployment:
    batchAccountName - $batchAccountName
    keyVault - $keyVault"

    exit 1
fi

. "${0%/*}/setup-all-pools-for-batch.sh"

echo "The '$batchAccountName' Azure Batch account successfully deployed"

