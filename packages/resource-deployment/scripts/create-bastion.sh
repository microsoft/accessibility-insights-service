#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create Azure Bastion service https://learn.microsoft.com/en-us/azure/bastion/create-host-cli

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription name or id>]
"
    exit 1
}

createBastionSubnet() {
    az network vnet subnet create --name "AzureBastionSubnet" --resource-group "$resourceGroupName" --vnet-name "$vnetName" --address-prefixes "10.2.1.0/26" 1>/dev/null
}

createPublicIp() {
    bastionIpName="bastion-ip-$resourceGroupSuffix"
    az network public-ip create --resource-group "$resourceGroupName" --name "$bastionIpName" --sku Standard 1>/dev/null

    local end=$((SECONDS + 300))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        sleep 10
        printf "."
        local name=$(az network public-ip list --resource-group "$resourceGroupName" --query "[?name=='${bastionIpName}'].name" -o tsv)
        if [[ ! -z "${name}" ]]; then
            break
        fi
    done
    echo " "
}

createBastion() {
    echo "Creating Bastion service (it takes about 10 minutes to create and deploy the resource)..."
    bastionName="bastion-$resourceGroupSuffix"
    az network bastion create --name "$bastionName" --public-ip-address "$bastionIpName" --resource-group "$resourceGroupName" --vnet-name "$vnetName" 1>/dev/null
}

# Read script arguments
while getopts ":s:r:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"
createBastionSubnet
createPublicIp
createBastion
