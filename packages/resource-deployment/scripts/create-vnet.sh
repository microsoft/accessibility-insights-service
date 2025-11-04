#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-a <address prefix (optional)> -s <subnet address prefix (optional)>]"
    exit 1
}

# Set default VNet template file
templateFilePath="${0%/*}/../templates/vnet.template.json"

# Read script arguments
while getopts ":a:s:r:" option; do
    case ${option} in
    a) addressPrefix=${OPTARG} ;;
    s) subnetAddressPrefix=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-subnet-address-prefixes.sh"
. "${0%/*}/get-resource-names.sh"

# Check if VNet already exists
echo "Checking if Virtual Network already exists..."
existingVnet=$(az network vnet show \
    --resource-group "${resourceGroupName}" \
    --name "${vnetName}" \
    --query "name" \
    -o tsv 2>/dev/null || true)

if [[ -n "${existingVnet}" ]]; then
    echo "Virtual Network already exists: ${vnetName}"
    echo "[create-vnet] Skipping VNet creation - VNet already exists"
fi

echo "Virtual Network does not exist. Proceeding with creation..."

# Set default values from centralized configuration
addressPrefix=${addressPrefix:-$(getVnetAddressPrefix)}
subnetAddressPrefix=${subnetAddressPrefix:-$(getDefaultSubnetPrefix)}

echo "[create-vnet] Starting Virtual Network creation"
echo "  VNet Address Prefix: ${addressPrefix}"
echo "  Default Subnet Address Prefix: ${subnetAddressPrefix}"

vnetResource=$(az deployment group create \
    --resource-group "${resourceGroupName}" \
    --template-file "${templateFilePath}" \
    --parameters addressPrefix="${addressPrefix}" subnetAddressPrefix="${subnetAddressPrefix}" \
    --query "properties.outputResources[].id" \
    -o tsv)

echo "[create-vnet] Virtual Network created = ${vnetResource}"
