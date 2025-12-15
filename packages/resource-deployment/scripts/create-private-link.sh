#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

# The script will create Azure Private Endpoint for Azure services (Storage, KeyVault, etc.)
# https://learn.microsoft.com/en-us/azure/private-link/create-private-endpoint-cli

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -g <group id> [-n <private endpoint name prefix (optional)>] [-s <service resource id (optional)>] [-p <subnet address prefix (optional)>] [-u <subnet name (optional)>] [-z <dns zone name (optional)>]

Required parameters:
  -r  Resource group name
  -g  Group ID / sub-resource (e.g., 'blob', 'vault', 'queue', 'table', 'file', 'sql', 'website')

Optional parameters:
  -n  Private endpoint name prefix (auto-detected based on group ID if not provided)
  -s  Service resource ID (auto-detected based on group ID if not provided)
       - If not specified, the script will automatically determine the resource ID
         using predefined resource names from the resource group
  -p  Subnet address prefix (auto-assigned based on group ID if not provided)
  -u  Subnet name (default: <prefix>-private-endpoint-subnet)
  -z  Private DNS zone name (auto-detected based on group ID if not provided)

Examples:
  # For Storage Blob (auto-detects storage account from resource group)
  ${BASH_SOURCE} -r myRG -g blob

  # For Key Vault with custom subnet
  ${BASH_SOURCE} -r myRG -g vault -p 10.2.10.0/26

  # For Cosmos DB sql API with explicit resource ID
  ${BASH_SOURCE} -r myRG -g sql -s /subscriptions/.../databaseAccounts/mycosmosdb
"
    exit 1
}

getDnsZoneName() {
    if [[ -n "${dnsZoneName}" ]]; then
        echo "Using provided DNS zone name: ${dnsZoneName}"
        return
    fi

    # Auto-detect DNS zone based on group ID
    case "${groupId}" in
    blob | website)
        dnsZoneName="privatelink.blob.core.windows.net"
        ;;
    queue)
        dnsZoneName="privatelink.queue.core.windows.net"
        ;;
    table)
        dnsZoneName="privatelink.table.core.windows.net"
        ;;
    file)
        dnsZoneName="privatelink.file.core.windows.net"
        ;;
    vault)
        dnsZoneName="privatelink.vaultcore.azure.net"
        ;;
    sql)
        dnsZoneName="privatelink.documents.azure.com"
        ;;
    *)
        echo "Error: Unknown group ID '${groupId}'. Please provide DNS zone name with -z parameter."
        exit 1
        ;;
    esac

    echo "Auto-detected DNS zone name: ${dnsZoneName}"
}

getServiceResourceId() {
    if [[ -n "${serviceResourceId}" ]]; then
        echo "Using provided service resource ID: ${serviceResourceId}"
        return
    fi

    echo "Auto-detecting service resource ID based on group ID '${groupId}'..."

    # Get resource names from get-resource-names.sh (already sourced)
    case "${groupId}" in
    blob | queue | table | file | website)
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

getPrivateEndpointNamePrefix() {
    if [[ -n "${privateEndpointNamePrefix}" ]]; then
        return
    fi

    # Auto-detect prefix based on group ID
    case "${groupId}" in
    blob | queue | table | file)
        privateEndpointNamePrefix="storage-${groupId}"
        ;;
    website)
        privateEndpointNamePrefix="storage-website"
        ;;
    vault)
        privateEndpointNamePrefix="keyvault"
        ;;
    sql)
        privateEndpointNamePrefix="cosmosdb"
        ;;
    *)
        privateEndpointNamePrefix="service"
        ;;
    esac

    echo "Using auto-detected private endpoint name prefix: ${privateEndpointNamePrefix}"
}

createPrivateEndpointSubnet() {
    echo "Checking if private endpoint subnet exists..."
    local existingSubnet
    existingSubnet=$(az network vnet subnet show --name "${subnetName}" --resource-group "${resourceGroupName}" --vnet-name "${vnetName}" --query "name" -o tsv 2>/dev/null || true)

    if [[ -z "${existingSubnet}" ]]; then
        echo "Creating private endpoint subnet in VNet ${vnetName}..."

        # Private endpoints cannot be created in delegated subnets
        # Subnet delegation is only needed for VNet integration, not private endpoints
        az network vnet subnet create \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" \
            --address-prefixes "${subnetAddressPrefix}" \
            --disable-private-endpoint-network-policies false \
            1>/dev/null
        echo "Private endpoint subnet created successfully"
    else
        echo "Private endpoint subnet already exists: ${subnetName}"

        # Verify that subnet is not delegated (private endpoints require non-delegated subnets)
        local delegation
        delegation=$(az network vnet subnet show \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" \
            --query "delegations[0].serviceName" \
            -o tsv 2>/dev/null || true)

        if [[ -n "${delegation}" ]]; then
            echo "  Warning: Subnet is delegated to ${delegation}"
            echo "  Private endpoints cannot be created in delegated subnets"
            echo "  Removing subnet delegation..."
            az network vnet subnet update \
                --name "${subnetName}" \
                --resource-group "${resourceGroupName}" \
                --vnet-name "${vnetName}" \
                --remove delegations 1>/dev/null
            echo "  Subnet delegation removed successfully"
        fi
    fi
}

createPrivateDnsZone() {
    echo "Checking if Private DNS zone exists..."
    local existingZone
    existingZone=$(az network private-dns zone show \
        --resource-group "${resourceGroupName}" \
        --name "${dnsZoneName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -z "${existingZone}" ]]; then
        echo "Creating Private DNS zone: ${dnsZoneName}..."
        az network private-dns zone create \
            --resource-group "${resourceGroupName}" \
            --name "${dnsZoneName}" 1>/dev/null
        echo "Private DNS zone created successfully"
    else
        echo "Private DNS zone already exists: ${dnsZoneName}"
    fi
}

linkDnsZoneToVnet() {
    echo "Checking if DNS zone is linked to VNet..."
    local linkName="${vnetName}-link"
    local existingLink
    existingLink=$(az network private-dns link vnet show \
        --resource-group "${resourceGroupName}" \
        --zone-name "${dnsZoneName}" \
        --name "${linkName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -z "${existingLink}" ]]; then
        echo "Linking Private DNS zone to VNet ${vnetName}..."
        az network private-dns link vnet create \
            --resource-group "${resourceGroupName}" \
            --zone-name "${dnsZoneName}" \
            --name "${linkName}" \
            --virtual-network "${vnetName}" \
            --registration-enabled false 1>/dev/null
        echo "DNS zone linked to VNet successfully"
    else
        echo "DNS zone already linked to VNet: ${linkName}"
    fi
}

createPrivateEndpoint() {
    echo "Creating Private Endpoint: ${privateEndpointName}..."

    # Check if private endpoint already exists
    local existingEndpoint
    existingEndpoint=$(az network private-endpoint show \
        --name "${privateEndpointName}" \
        --resource-group "${resourceGroupName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingEndpoint}" ]]; then
        echo "Private Endpoint already exists: ${privateEndpointName}"
        return
    fi

    # Map 'website' to 'blob' for Azure API (website is organizational only)
    local azureGroupId="${groupId}"
    if [[ "${groupId}" == "website" ]]; then
        azureGroupId="blob"
    fi

    az network private-endpoint create \
        --resource-group "${resourceGroupName}" \
        --name "${privateEndpointName}" \
        --vnet-name "${vnetName}" \
        --subnet "${subnetName}" \
        --private-connection-resource-id "${serviceResourceId}" \
        --group-id "${azureGroupId}" \
        --connection-name "${privateEndpointName}-conn" \
        --location "${location}" 1>/dev/null

    local end=$((SECONDS + 300))
    printf " - Waiting for Private Endpoint to be ready .."
    while [ "${SECONDS}" -le "${end}" ]; do
        sleep 10
        printf "."
        local provisioningState
        provisioningState=$(az network private-endpoint show \
            --name "${privateEndpointName}" \
            --resource-group "${resourceGroupName}" \
            --query "provisioningState" \
            -o tsv 2>/dev/null || true)

        if [[ "${provisioningState}" == "Succeeded" ]]; then
            break
        fi
    done
    echo " "

    privateEndpointId=$(az network private-endpoint show \
        --name "${privateEndpointName}" \
        --resource-group "${resourceGroupName}" \
        --query "id" \
        -o tsv)

    echo "Private Endpoint created successfully: ${privateEndpointId}"
}

createDnsZoneGroup() {
    echo "Creating DNS zone group for automatic DNS registration..."

    local zoneGroupName="${privateEndpointName}-dns-group"
    local existingGroup
    existingGroup=$(az network private-endpoint dns-zone-group show \
        --endpoint-name "${privateEndpointName}" \
        --resource-group "${resourceGroupName}" \
        --name "${zoneGroupName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingGroup}" ]]; then
        echo "DNS zone group already exists: ${zoneGroupName}"
        return
    fi

    local dnsZoneId
    dnsZoneId=$(az network private-dns zone show \
        --resource-group "${resourceGroupName}" \
        --name "${dnsZoneName}" \
        --query "id" \
        -o tsv)

    # Map 'website' to 'blob' for Azure API (website is organizational only)
    local azureGroupId="${groupId}"
    if [[ "${groupId}" == "website" ]]; then
        azureGroupId="blob"
    fi

    az network private-endpoint dns-zone-group create \
        --resource-group "${resourceGroupName}" \
        --endpoint-name "${privateEndpointName}" \
        --name "${zoneGroupName}" \
        --private-dns-zone "${dnsZoneId}" \
        --zone-name "${azureGroupId}" 1>/dev/null

    echo "DNS zone group created successfully"
}

disablePublicNetworkAccess() {
    echo "Disabling public network access to the service..."

    case "${groupId}" in
    blob | queue | table | file | website)
        local accountName
        accountName=$(basename "${serviceResourceId}")
        echo "  Disabling public access for Storage Account: ${accountName}..."

        az storage account update \
            --resource-group "${resourceGroupName}" \
            --name "${accountName}" \
            --public-network-access Disabled \
            --allow-blob-public-access false 1>/dev/null

        echo "  Storage Account public access disabled successfully"
        ;;
    vault)
        local vaultName
        vaultName=$(basename "${serviceResourceId}")
        echo "  Disabling public access for Key Vault: ${vaultName}..."

        az keyvault update \
            --resource-group "${resourceGroupName}" \
            --name "${vaultName}" \
            --public-network-access Disabled 1>/dev/null

        echo "  Key Vault public access disabled successfully"
        ;;
    sql)
        local cosmosAccountName
        cosmosAccountName=$(basename "${serviceResourceId}")
        echo "  Disabling public access for Cosmos DB Account: ${cosmosAccountName}..."

        az cosmosdb update \
            --resource-group "${resourceGroupName}" \
            --name "${cosmosAccountName}" \
            --public-network-access Disabled 1>/dev/null

        echo "  Cosmos DB Account public access disabled successfully"
        ;;
    *)
        echo "  Warning: Unknown group ID '${groupId}'. Skipping public access configuration."
        ;;
    esac
}

# Read script arguments
while getopts ":r:n:s:g:p:u:z:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    n) privateEndpointNamePrefix=${OPTARG} ;;
    s) serviceResourceId=${OPTARG} ;;
    g) groupId=${OPTARG} ;;
    p) subnetAddressPrefix=${OPTARG} ;;
    u) subnetName=${OPTARG} ;;
    z) dnsZoneName=${OPTARG} ;;
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

# Get resource names and location
. "${0%/*}/get-resource-names.sh"
. "${0%/*}/get-subnet-address-prefixes.sh"
location=$(az group show --name "${resourceGroupName}" --query "location" -o tsv)

# Determine DNS zone name and default subnet prefix
getDnsZoneName

# Auto-detect private endpoint name prefix if not provided
getPrivateEndpointNamePrefix

# Auto-detect service resource ID if not provided
getServiceResourceId

# Set default values if not provided
defaultSubnetPrefix=$(getPrivateEndpointSubnetPrefix "${groupId}")
subnetAddressPrefix=${subnetAddressPrefix:-${defaultSubnetPrefix}}
subnetName=${subnetName:-"${privateEndpointNamePrefix}-private-endpoint-subnet"}
# resourceGroupSuffix is set by get-resource-names.sh
privateEndpointName="${privateEndpointNamePrefix}-private-endpoint-${resourceGroupSuffix}"

echo "[create-private-link] Starting Private Endpoint creation"
echo "  Resource Group: ${resourceGroupName}"
echo "  Private Endpoint Name: ${privateEndpointName}"
echo "  Service Resource ID: ${serviceResourceId}"
echo "  Group ID: ${groupId}"
echo "  VNet: ${vnetName}"
echo "  Subnet Name: ${subnetName}"
echo "  Subnet Address Prefix: ${subnetAddressPrefix}"
echo "  DNS Zone Name: ${dnsZoneName}"
echo "  Location: ${location}"
echo ""

createPrivateEndpointSubnet
createPrivateDnsZone
linkDnsZoneToVnet
createPrivateEndpoint
createDnsZoneGroup
disablePublicNetworkAccess

echo ""
echo "[create-private-link] Private Endpoint setup completed successfully"
echo "  Private Endpoint: ${privateEndpointName}"
echo "  DNS Zone: ${dnsZoneName}"
echo "  Subnet: ${subnetName}"
