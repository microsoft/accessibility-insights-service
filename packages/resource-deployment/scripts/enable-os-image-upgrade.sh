#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -v <vmss name> -r <vmss resource group> -b <batch resource group name>
"
    exit 1
}

templateFilePath="${0%/*}/../templates/vmss-health-extension.json"

# Read script arguments
while getopts ":v:r:b:" option; do
    case ${option} in
    v) vmssName=${OPTARG} ;;
    r) vmssResourceGroup=${OPTARG} ;;
    b) resourceGroupName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

. "${0%/*}/get-resource-names.sh"

if [[ -z ${vmssName} ]] || [[ -z ${vmssResourceGroup} ]] || [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

az vmss extension set \
    --name ApplicationHealthWindows \
    --publisher Microsoft.ManagedServices \
    --enable-auto-upgrade true \
    --resource-group "${vmssResourceGroup}" \
    --vmss-name "${vmssName}" \
    --settings "$templateFilePath" 1>/dev/null

az vmss update \
    --resource-group "${vmssResourceGroup}" \
    --name "${vmssName}" \
    --set virtualMachineProfile.osProfile.windowsConfiguration.enableAutomaticUpdates=false 1>/dev/null

az vmss update \
    --resource-group "${vmssResourceGroup}" \
    --name "${vmssName}" \
    --set upgradePolicy.automaticOsUpgradePolicy.enableAutomaticOsUpgrade=true 1>/dev/null
