#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -n <name of the public IP address> -d <globally unique DNS entry>
"
    exit 1
}

# Read script arguments
while getopts ":r:n:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    n) publicIpAddressName=${OPTARG} ;;
    d) dnsName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${publicIpAddressName} ]] || [[ -z ${dnsName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

# The DNS name cannot start with digit
if [[ $dnsName =~ ^[[:digit:]] ]]; then
    dnsName="a$dnsName"
    echo "DNS name is updated to '$dnsName' to conform to name requirements."
fi

ipAddress=$(az network public-ip list --resource-group "${resourceGroupName}" --query "[?name=='${publicIpAddressName}'].ipAddress" -o tsv)
if [[ -z ${ipAddress} ]]; then
    echo "Deploying public IP address ${publicIpAddressName}"
    ipAddress=$(az network public-ip create \
        --resource-group "${resourceGroupName}" \
        --name "${publicIpAddressName}" \
        --dns-name "${dnsName}" \
        --allocation-method Static --sku Standard --tier Regional --version IPv4 \
        --query "publicIp.ipAddress" -o tsv)

    echo "Public IP address ${publicIpAddressName} with IP ${ipAddress} successfully deployed"
else
    echo "Public IP address ${publicIpAddressName} with IP ${ipAddress} already deployed"
fi
