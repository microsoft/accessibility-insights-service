#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

defaultConfigFileFolder="${0%/*}/../runtime-config"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-f <service config files directory, default ${defaultConfigFileFolder} >]
"
    exit 1
}

while getopts ":r:f:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    f) configFileFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${configFileFolder} ]]; then
    configFileFolder=${defaultConfigFileFolder}
fi

updateConfigFiles() {
    echo "Updating service configuration .availabilityTestConfig.urlToScan property with E2E test site URL: ${siteUrl}"
    for configFilePath in "${configFileFolder}"/*.json; do
        tempFilePath="${0%/*}/temp-$(date +%s)${RANDOM}.json"
        jq "if .availabilityTestConfig.urlToScan then . else .availabilityTestConfig += {\"urlToScan\": \"${siteUrl}\"} end" "${configFilePath}" >"${tempFilePath}" && mv "${tempFilePath}" "${configFilePath}"
    done
}

. "${0%/*}/get-resource-names.sh"

# Get website blob endpoint URL
siteUrl="https://${websiteStorageAccountName}.blob.core.windows.net/\$web/index.html"

updateConfigFiles
echo "Service configuration files updated."
