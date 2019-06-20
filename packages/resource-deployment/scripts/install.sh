#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export subscription
export location
export storageAccountName
export batchAccountName
export keyVault
export keyVaultUrl
export cosmosAccountName
export dropFolder="${0%/*}/../../"
export templatesFolder="${0%/*}/../templates/"
export appInsightsKey

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id> -l <azure region>
"
    exit 1
}

# Read script arguments
while getopts "r:s:l:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

az account set --subscription "$subscription"

. "${0%/*}/create-resource-group.sh"

. "${0%/*}/create-storage-account.sh"

. "${0%/*}/upload-files.sh"

. "${0%/*}/create-queues.sh"

. "${0%/*}/setup-cosmos-db.sh"

. "${0%/*}/batch-account-create.sh"

. "${0%/*}/push-secrets-to-key-vault.sh"

# shellcheck disable=SC2154
keyVaultUrl=$(az keyvault show --name "$keyVault" --resource-group "$resourceGroupName" --query "properties.vaultUri" -o tsv)
echo "Fetched keyvault url $keyVaultUrl"

. "${0%/*}/app-insights-create.sh"

. "${0%/*}/job-schedule-create.sh"
