#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -a <address prefix> -s <subnet address prefix> -r <resource group>"
    exit 1
}

# Set default Api gateway template file
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

if [[ -z $addressPrefix ]] || [[ -z $subnetAddressPrefix ]] || [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

vnetResource=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$templateFilePath" \
    --parameters addressPrefix="$addressPrefix" subnetAddressPrefix="$subnetAddressPrefix" \
    --query "properties.outputResources[].id" \
    -o tsv)

echo $vnetResource
