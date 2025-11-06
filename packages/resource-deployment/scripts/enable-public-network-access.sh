#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# The script will enable public network access for Azure services

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -g <group id> [-s <service resource id (optional)>]

Required parameters:
  -r  Resource group name
  -g  Group ID / sub-resource (e.g., 'blob', 'queue', 'table', 'file', 'sql', 'vault')

Optional parameters:
  -s  Service resource ID (auto-detected based on group ID if not provided)

Examples:
  # For Storage Account (auto-detects from resource group)
  ${BASH_SOURCE} -r myRG -g blob

  # For Key Vault
  ${BASH_SOURCE} -r myRG -g vault

  # For Cosmos DB with explicit resource ID
  ${BASH_SOURCE} -r myRG -g sql -s /subscriptions/.../databaseAccounts/mycosmosdb
"
    exit 1
}

getServiceResourceId() {
    if [[ -n "${serviceResourceId}" ]]; then
        echo "Using provided service resource ID: ${serviceResourceId}"
        return
    fi

    echo "Auto-detecting service resource ID based on group ID '${groupId}'..."

    # Get resource names from get-resource-names.sh (already sourced)
    case "${groupId}" in
    blob | queue | table | file)
        if [[ -z "${storageAccountName}" ]]; then
            echo "Error: Storage account name not found in resource group ${resourceGroupName}"
            exit 1
        fi
        serviceResourceId="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}"
        echo "  Detected Storage Account: ${storageAccountName}"
        ;;
    vault)
        if [[ -z "${keyVault}" ]]; then
            echo "Error: Key Vault name not found in resource group ${resourceGroupName}"
            exit 1
        fi
        serviceResourceId="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVault}"
        echo "  Detected Key Vault: ${keyVault}"
        ;;
    sql)
        if [[ -z "${cosmosAccountName}" ]]; then
            echo "Error: Cosmos DB account name not found in resource group ${resourceGroupName}"
            exit 1
        fi
        serviceResourceId="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/${cosmosAccountName}"
        echo "  Detected Cosmos DB Account: ${cosmosAccountName}"
        ;;
    *)
        echo "Error: Unknown group ID '${groupId}'. Please provide service resource ID with -s parameter."
        exit 1
        ;;
    esac

    echo "Auto-detected service resource ID: ${serviceResourceId}"
}

enablePublicNetworkAccess() {
    echo "Checking and enabling public network access if service exists..."

    case "${groupId}" in
    blob | queue | table | file)
        local accountName
        accountName=$(basename "${serviceResourceId}")

        # Check if storage account exists
        local accountExists
        accountExists=$(az storage account show \
            --resource-group "${resourceGroupName}" \
            --name "${accountName}" \
            --query "name" \
            -o tsv 2>/dev/null || true)

        if [[ -n "${accountExists}" ]]; then
            echo "  Enabling public access for Storage Account: ${accountName}..."
            az storage account update \
                --resource-group "${resourceGroupName}" \
                --name "${accountName}" \
                --public-network-access Enabled 1>/dev/null
            echo "  Storage Account public access enabled successfully"
        else
            echo "  Storage Account does not exist yet: ${accountName}"
        fi
        ;;
    vault)
        local vaultName
        vaultName=$(basename "${serviceResourceId}")

        # Check if key vault exists
        local vaultExists
        vaultExists=$(az keyvault show \
            --resource-group "${resourceGroupName}" \
            --name "${vaultName}" \
            --query "name" \
            -o tsv 2>/dev/null || true)

        if [[ -n "${vaultExists}" ]]; then
            echo "  Enabling public access for Key Vault: ${vaultName}..."
            az keyvault update \
                --resource-group "${resourceGroupName}" \
                --name "${vaultName}" \
                --public-network-access Enabled 1>/dev/null
            echo "  Key Vault public access enabled successfully"
        else
            echo "  Key Vault does not exist yet: ${vaultName}"
        fi
        ;;
    sql)
        local cosmosAccountName
        cosmosAccountName=$(basename "${serviceResourceId}")

        # Check if cosmos db account exists
        local cosmosExists
        cosmosExists=$(az cosmosdb show \
            --resource-group "${resourceGroupName}" \
            --name "${cosmosAccountName}" \
            --query "name" \
            -o tsv 2>/dev/null || true)

        if [[ -n "${cosmosExists}" ]]; then
            echo "  Enabling public access for Cosmos DB Account: ${cosmosAccountName}..."
            az cosmosdb update \
                --resource-group "${resourceGroupName}" \
                --name "${cosmosAccountName}" \
                --public-network-access Enabled 1>/dev/null
            echo "  Cosmos DB Account public access enabled successfully"
        else
            echo "  Cosmos DB Account does not exist yet: ${cosmosAccountName}"
        fi
        ;;
    *)
        echo "  Warning: Unknown group ID '${groupId}'. Skipping public access configuration."
        ;;
    esac
}

# Read script arguments
while getopts ":r:g:s:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    g) groupId=${OPTARG} ;;
    s) serviceResourceId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${groupId} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Get resource names
. "${0%/*}/get-resource-names.sh"

# Auto-detect service resource ID if not provided
getServiceResourceId

echo "[enable-public-network-access] Starting public network access enablement"
echo "  Resource Group: ${resourceGroupName}"
echo "  Service Resource ID: ${serviceResourceId}"
echo "  Group ID: ${groupId}"
echo ""

enablePublicNetworkAccess

echo ""
echo "[enable-public-network-access] Public network access enablement completed"
