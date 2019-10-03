#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-a <address prefix (optional)> -s <subnet address prefix (optional)>]"
    exit 1
}

# Set default vnet template file
templateFilePath="${0%/*}/../templates/vnet.template.json"

# Read script arguments
while getopts ":a:s:r:" option; do
    case $option in
    a) addressPrefix=${OPTARG} ;;
    s) subnetAddressPrefix=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

addressPrefix=${addressPrefix:-"10.2.0.0/16"}
subnetAddressPrefix=${subnetAddressPrefix:-"10.2.0.0/24"}

echo "[create-vnet] Starting Virtual Network creation"

vnetResource=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --parameters addressPrefix="$addressPrefix" subnetAddressPrefix="$subnetAddressPrefix" \
    --query "properties.outputResources[].id" \
    -o tsv)

echo "[create-vnet] Virtual Network created = $vnetResource"
