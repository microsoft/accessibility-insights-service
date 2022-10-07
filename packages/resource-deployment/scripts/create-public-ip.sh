#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-n <name of the public IP address>] [-d <globally unique DNS entry>]
"
    exit 1
}

# Read script arguments
while getopts ":r:n:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    n) batchPublicIpAddressName=${OPTARG} ;;
    d) dnsName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

if [[ -z ${dnsName} ]]; then
    dnsName=${batchAccountName}
fi

ipAddress=$(az network public-ip list --resource-group "${resourceGroupName}" --query "[?name=='${batchPublicIpAddressName}'].ipAddress" -o tsv)
if [[ -z ${ipAddress} ]]; then
    echo "Deploying public IP address ${batchPublicIpAddressName}"
    ipAddress=$(az network public-ip create \
        --resource-group "${resourceGroupName}" \
        --name "${batchPublicIpAddressName}" \
        --dns-name "${dnsName}" \
        --allocation-method Static --sku Standard --tier Regional --version IPv4 \
        --query "publicIp.ipAddress" -o tsv)

    echo "Public IP address ${batchPublicIpAddressName} with IP ${ipAddress} successfully deployed"
else
    echo "Public IP address ${batchPublicIpAddressName} with IP ${ipAddress} already deployed"
fi
