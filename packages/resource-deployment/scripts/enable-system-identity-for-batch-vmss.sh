#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will enable system-assigned managed identity on Batch pool VMSS

exitWithUsageInfo() {
    echo "
Usage: $0 -v <vmss name> -r <vmss resource group> -p <batch pool>
"
    exit 1
}

assignSystemIdentity() {
    principalId=$(az vmss identity assign --name "$vmssName" --resource-group "$vmssResourceGroup" --query systemAssignedIdentity -o tsv)

    echo \
        "VMSS Resource configuration:
  Pool: $pool
  VMSS resource group: $vmssResourceGroup
  VMSS name: $vmssName
  System-assigned identity: $principalId
  "
    
   . "${0%/*}/key-vault-enable-msi.sh"
   . "${0%/*}/role-assign-for-sp.sh"
}

# Read script arguments
while getopts ":v:r:p:" option; do
    case $option in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    p) pool=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

echo "
Assigning System identity for:
vmssName:$vmssName
vmssResourceGroup:$vmssResourceGroup
pool:$pool
"
if [[ -z $vmssName ]] || [[ -z $vmssResourceGroup ]] || [[ -z $pool ]]; then
    exitWithUsageInfo
fi

assignSystemIdentity
