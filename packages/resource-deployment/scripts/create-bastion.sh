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
    echo "Checking if Azure Bastion subnet exists..."
    local existingSubnet
    existingSubnet=$(az network vnet subnet show \
        --name "AzureBastionSubnet" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingSubnet}" ]]; then
        echo "Azure Bastion subnet already exists: AzureBastionSubnet"
        return
    fi

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

    echo "Checking if Bastion public IP exists..."
    local existingIp
    existingIp=$(az network public-ip show \
        --resource-group "${resourceGroupName}" \
        --name "${bastionIpName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingIp}" ]]; then
        echo "Bastion public IP already exists: ${bastionIpName}"
        return
    fi

    echo "Creating Bastion public IP..."
    az network public-ip create --resource-group "${resourceGroupName}" --name "${bastionIpName}" --sku Standard 1>/dev/null

    local end=$((SECONDS + 300))
    printf " - Waiting for public IP to be ready .."
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
    echo "Bastion public IP created: ${bastionIpName}"
}

createBastion() {
    bastionName="bastion-${resourceGroupSuffix}"

    echo "Checking if Bastion service exists..."
    local existingBastion
    existingBastion=$(az network bastion show \
        --name "${bastionName}" \
        --resource-group "${resourceGroupName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingBastion}" ]]; then
        echo "Bastion service already exists: ${bastionName}"
        return
    fi

    echo "Creating Bastion service (it takes about 10 minutes to create and deploy the resource)..."
    az network bastion create \
        --name "${bastionName}" \
        --public-ip-address "${bastionIpName}" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --sku Standard 1>/dev/null
    echo "Bastion service created: ${bastionName}"
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
