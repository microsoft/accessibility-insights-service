#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export resourceGroupName
export keyVaultUrl
export appInsightsName
export environment

if [[ -z $environment ]]; then
    environment="dev"
fi

exitWithUsageInfo() {
    echo "
        Usage: $0 -r <resource group name> [-k <key vault url>]
    "
    exit 1
}

# Read script arguments
while getopts ":r:k:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) keyVaultUrl=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

echo "Copy the runtime configuration to the container"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../../web-api-scan-runner/dist/runtime-config.json"
cp "${0%/*}/../runtime-config/runtime-config.$environment.json" "${0%/*}/../../..//web-api-scan-job-manager/dist/runtime-config.json"
echo "Runtime configuration was copied successfully"


. "${0%/*}/get-resource-names.sh"

if [[ -z $keyVaultUrl ]]; then
    echo "Resolving Key Vault URL for Key Vault $keyVault..."
    keyVaultUrl=$(az keyvault show --name "$keyVault" --resource-group "$resourceGroupName" --query "properties.vaultUri" -o tsv)
    if [[ -z "$keyVaultUrl" ]]; then
        echo "could not find keyvault in resource group $resourceGroupName"
        exitWithUsageInfo
    fi
    echo "  Key Vault URL $keyVaultUrl"
fi

appInsightsKey=$(az monitor app-insights component show --app "$appInsightsName" --resource-group "$resourceGroupName" --query "instrumentationKey" -o tsv)

echo "Setting the enviroment variables for the container"
sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "${0%/*}/../../../web-api-scan-runner/dist/Dockerfile-Template" >"${0%/*}/../../../web-api-scan-runner/dist/Dockerfile"
sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "${0%/*}/../../../web-api-scan-job-manager/dist/Dockerfile-Template" >"${0%/*}/../../../web-api-scan-job-manager/dist/Dockerfile"
echo "Enviroment variables were set successfully."
