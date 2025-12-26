#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

# The script will delete Azure Private Endpoint and associated resources created by create-private-link.sh

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -g <group id> [-n <private endpoint name prefix (optional)>] [-u <subnet name (optional)>] [-z <dns zone name (optional)>] [-k <keep subnet (optional)>]

Required parameters:
  -r  Resource group name
  -g  Group ID / sub-resource (e.g., 'blob', 'vault', 'queue', 'table', 'file', 'sites', 'sql', 'website')

Optional parameters:
  -n  Private endpoint name prefix (auto-detected based on group ID if not provided)
  -u  Subnet name (default: <prefix>-private-endpoint-subnet)
  -z  Private DNS zone name (auto-detected based on group ID if not provided)
  -k  Keep subnet (don't delete subnet, just remove private endpoint)

Examples:
  # Delete all resources for Storage Blob private endpoint (auto-detects prefix)
  ${BASH_SOURCE} -r myRG -g blob

  # Delete Key Vault private endpoint but keep the subnet
  ${BASH_SOURCE} -r myRG -g vault -k

  # Delete Function App web-workers private endpoint
  ${BASH_SOURCE} -r myRG -g sites -n web-workers

  # Delete Cosmos DB private endpoint with custom subnet name
  ${BASH_SOURCE} -r myRG -g sql -u custom-subnet
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
    sites)
        dnsZoneName="privatelink.azurewebsites.net"
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
    sites)
        privateEndpointNamePrefix="web-api"
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

deletePrivateEndpoint() {
    echo "Checking if Private Endpoint exists..."
    local existingEndpoint
    existingEndpoint=$(az network private-endpoint show \
        --name "${privateEndpointName}" \
        --resource-group "${resourceGroupName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingEndpoint}" ]]; then
        echo "Deleting Private Endpoint: ${privateEndpointName}..."
        az network private-endpoint delete \
            --name "${privateEndpointName}" \
            --resource-group "${resourceGroupName}" 1>/dev/null
        echo "Private Endpoint deleted successfully"
    else
        echo "Private Endpoint does not exist: ${privateEndpointName}"
    fi
}

deleteDnsZoneLink() {
    echo "Checking if DNS zone link exists..."
    local linkName="${vnetName}-link"
    local existingLink
    existingLink=$(az network private-dns link vnet show \
        --resource-group "${resourceGroupName}" \
        --zone-name "${dnsZoneName}" \
        --name "${linkName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingLink}" ]]; then
        echo "Deleting DNS zone link: ${linkName}..."
        az network private-dns link vnet delete \
            --resource-group "${resourceGroupName}" \
            --zone-name "${dnsZoneName}" \
            --name "${linkName}" \
            --yes 1>/dev/null
        echo "DNS zone link deleted successfully"
    else
        echo "DNS zone link does not exist: ${linkName}"
    fi
}

deleteDnsZone() {
    echo "Checking if Private DNS zone should be deleted..."

    # Check if there are any other VNet links to this zone
    local linkCount
    linkCount=$(az network private-dns link vnet list \
        --resource-group "${resourceGroupName}" \
        --zone-name "${dnsZoneName}" \
        --query "length(@)" \
        -o tsv 2>/dev/null || echo "0")

    if [[ "${linkCount}" -gt 0 ]]; then
        echo "DNS zone has ${linkCount} VNet link(s) remaining. Skipping DNS zone deletion."
        return
    fi

    # Check if there are any A records (besides SOA/NS)
    local recordCount
    recordCount=$(az network private-dns record-set a list \
        --resource-group "${resourceGroupName}" \
        --zone-name "${dnsZoneName}" \
        --query "length(@)" \
        -o tsv 2>/dev/null || echo "0")

    if [[ "${recordCount}" -gt 0 ]]; then
        echo "DNS zone has ${recordCount} A record(s) remaining. Skipping DNS zone deletion."
        return
    fi

    local existingZone
    existingZone=$(az network private-dns zone show \
        --resource-group "${resourceGroupName}" \
        --name "${dnsZoneName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingZone}" ]]; then
        echo "Deleting Private DNS zone: ${dnsZoneName}..."
        az network private-dns zone delete \
            --resource-group "${resourceGroupName}" \
            --name "${dnsZoneName}" \
            --yes 1>/dev/null
        echo "Private DNS zone deleted successfully"
    else
        echo "Private DNS zone does not exist: ${dnsZoneName}"
    fi
}

deleteSubnet() {
    if [[ "${keepSubnet}" == "true" ]]; then
        echo "Keeping subnet as requested: ${subnetName}"
        return
    fi

    echo "Checking if subnet exists..."
    local existingSubnet
    existingSubnet=$(az network vnet subnet show \
        --name "${subnetName}" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingSubnet}" ]]; then
        # Check if subnet has any other resources
        local ipConfigCount
        ipConfigCount=$(az network vnet subnet show \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" \
            --query "length(ipConfigurations)" \
            -o tsv 2>/dev/null || echo "0")

        if [[ "${ipConfigCount}" -gt 0 ]]; then
            echo "Subnet has ${ipConfigCount} IP configuration(s) remaining. Skipping subnet deletion."
            return
        fi

        echo "Deleting subnet: ${subnetName}..."
        az network vnet subnet delete \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" 1>/dev/null
        echo "Subnet deleted successfully"
    else
        echo "Subnet does not exist: ${subnetName}"
    fi
}

# Read script arguments
keepSubnet="false"
while getopts ":r:n:g:u:z:k" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    n) privateEndpointNamePrefix=${OPTARG} ;;
    g) groupId=${OPTARG} ;;
    u) subnetName=${OPTARG} ;;
    z) dnsZoneName=${OPTARG} ;;
    k) keepSubnet="false" ;;
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

# Determine DNS zone name
getDnsZoneName

# Auto-detect private endpoint name prefix if not provided
getPrivateEndpointNamePrefix

# Set default values if not provided
subnetName=${subnetName:-"${privateEndpointNamePrefix}-private-endpoint-subnet"}
# resourceGroupSuffix is set by get-resource-names.sh
privateEndpointName="${privateEndpointNamePrefix}-private-endpoint-${resourceGroupSuffix}"

echo "[delete-private-link] Starting Private Endpoint cleanup"
echo "  Resource Group: ${resourceGroupName}"
echo "  Private Endpoint Name: ${privateEndpointName}"
echo "  Group ID: ${groupId}"
echo "  VNet: ${vnetName}"
echo "  Subnet Name: ${subnetName}"
echo "  DNS Zone Name: ${dnsZoneName}"
echo "  Keep Subnet: ${keepSubnet}"
echo ""

# Delete resources in reverse order of creation
deletePrivateEndpoint
deleteDnsZoneLink
deleteDnsZone
deleteSubnet

echo ""
echo "[delete-private-link] Cleanup completed successfully"
