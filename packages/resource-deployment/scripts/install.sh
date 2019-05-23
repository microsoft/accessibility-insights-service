#!/bin/bash
set -eo pipefail

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -r <resource group> -s <subscription name or id>
"
    exit 1
}

export resourceGroupName
export subscription
export location
export storageAccountName
export batchAccountName
export keyVault
export cosmosAccountName

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

# shellcheck disable=SC1090
. "${0%/*}/create-resource-group.sh"

# shellcheck disable=SC1090
. "${0%/*}/create-storage-account.sh"

# shellcheck disable=SC1090
. "${0%/*}/create-queues.sh"

# shellcheck disable=SC1090
. "${0%/*}/setup-cosmos-db.sh"

# shellcheck disable=SC1090
. "${0%/*}/batch-account-create.sh"
echo "Successfully setup batch account $batchAccountName with keyvault $keyVault"

# shellcheck disable=SC1090
. "${0%/*}/push-secrets-to-key-vault.sh"
