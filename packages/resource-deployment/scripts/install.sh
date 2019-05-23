#!/bin/bash
# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export subscription
export location
export storageAccountName
export batchAccountName
export keyVault
export keyVaultUri
export cosmosAccountName
export dropFolder="${0%/*}/../../"
export templatesFolder="${0%/*}/../"
export appInsightsKey

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id>
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

. "${0%/*}/create-queues.sh"

. "${0%/*}/setup-cosmos-db.sh"

. "${0%/*}/batch-account-create.sh"

. "${0%/*}/push-secrets-to-key-vault.sh"

. "${0%/*}/upload-files.sh"

# shellcheck disable=SC2154
keyVaultUri=$(az keyvault show --name "$keyvault" --query "properties.vaultUri" -o tsv)

. "${0%/*}/app-insights-create.sh"
