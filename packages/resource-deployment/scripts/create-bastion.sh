#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create Azure Bastion service https://learn.microsoft.com/en-us/azure/bastion/create-host-cli

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group>
"
    exit 1
}

createBastionSubnet() {
    echo "Creating Azure Bastion subnet..."
    local bastionSubnetPrefix
    bastionSubnetPrefix=$(getBastionSubnetPrefix)

    az network vnet subnet create \
        --name "AzureBastionSubnet" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --address-prefixes "${bastionSubnetPrefix}" 1>/dev/null

    echo "Azure Bastion subnet created: ${bastionSubnetPrefix}"
}

createPublicIp() {
    bastionIpName="bastion-ip-${resourceGroupSuffix}"
    az network public-ip create --resource-group "${resourceGroupName}" --name "${bastionIpName}" --sku Standard 1>/dev/null

    local end=$((SECONDS + 300))
    printf " - Running .."
    local name
    while [ "${SECONDS}" -le "${end}" ]; do
        sleep 10
        printf "."
        name=$(az network public-ip list --resource-group "${resourceGroupName}" --query "[?name=='${bastionIpName}'].name" -o tsv)
        if [[ ! -z "${name}" ]]; then
            break
        fi
    done
    echo " "
}

createBastion() {
    echo "Creating Bastion service (it takes about 10 minutes to create and deploy the resource)..."
    bastionName="bastion-${resourceGroupSuffix}"
    az network bastion create --name "${bastionName}" --public-ip-address "${bastionIpName}" --resource-group "${resourceGroupName}" --vnet-name "${vnetName}" 1>/dev/null
}

# Read script arguments
while getopts ":r:" option; do
    case ${option} in
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

# Get resource names and subnet prefixes
. "${0%/*}/get-resource-names.sh"
. "${0%/*}/get-subnet-address-prefixes.sh"

createBastionSubnet
createPublicIp
createBastion
