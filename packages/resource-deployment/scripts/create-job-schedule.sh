#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export batchAccountName
export resourceGroupName
export keyVaultUrl
export templatesFolder
export appInsightsName

templatesFolder="${0%/*}/../templates/"

onDemandScanReqScheduleJobName="on-demand-scan-req-schedule"
parsedOnDemandScanReqScheduleFileName="on-demand-scan-req-schedule.generated.template.json"

privacyScanScheduleJobName="privacy-scan-schedule"
parsedPrivacyScanScheduleFileName="privacy-scan-schedule.generated.template.json"

adjustJob() {
    local jobName=$1
    local jobTemplate=$2
    local allJobsScheduleList=$3
    local foundJobSchedule=false

    for schedule in ${allJobsScheduleList}; do
        local scheduleId="${schedule//[$'\t\r\n ']/}"

        if [[ ${scheduleId} == "${jobName}" ]]; then
            foundJobSchedule=true
            break
        fi
    done

    if [[ ${foundJobSchedule} == true ]]; then
        echo "The ${jobName} job schedule exists. Resetting job schedule."
        az batch job-schedule reset --job-schedule-id "${jobName}" --json-file "${jobTemplate}" 1>/dev/null
    else
        echo "The ${jobName} job schedule doesn't exist. Creating job schedule."
        az batch job-schedule create --json-file "${jobTemplate}" 1>/dev/null
    fi
}

exitWithUsageInfo() {
    echo "
        Usage: ${BASH_SOURCE} -b <batch account name> -r <resource group name> [-k <key vault url>] [-t <path to template folder (optional), defaults to ${templatesFolder} folder relative to the current working directory>]
    "
    exit 1
}

# Read script arguments
while getopts ":b:r:k:t:" option; do
    case ${option} in
    b) batchAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVaultUrl=${OPTARG} ;;
    t) templatesFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${batchAccountName} ]] || [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

if [[ -z ${keyVaultUrl} ]]; then
    keyVaultUrl="https://${keyVault}.vault.azure.net/"
fi

appInsightsConnectionString=$(az monitor app-insights component show --app "${appInsightsName}" --resource-group "${resourceGroupName}" --query "connectionString" -o tsv)

clientId=$(az identity show --name "${batchNodeManagedIdentityName}" --resource-group "${resourceGroupName}" --query clientId -o tsv)
appInsightsAuthString="Authorization=AAD;ClientId=${clientId}"

sed -e "s@%APP_INSIGHTS_CONNECTION_STRING%@${appInsightsConnectionString}@" -e "s@%APP_INSIGHTS_AUTH_STRING%@${appInsightsAuthString}@" -e "s@%KEY_VAULT_TOKEN%@${keyVaultUrl}@" -e "s@%CONTAINER_REGISTRY_TOKEN%@${containerRegistryName}@" "${templatesFolder}/on-demand-scan-req-schedule.template.json" >"${parsedOnDemandScanReqScheduleFileName}"
sed -e "s@%APP_INSIGHTS_CONNECTION_STRING%@${appInsightsConnectionString}@" -e "s@%APP_INSIGHTS_AUTH_STRING%@${appInsightsAuthString}@" -e "s@%KEY_VAULT_TOKEN%@${keyVaultUrl}@" -e "s@%CONTAINER_REGISTRY_TOKEN%@${containerRegistryName}@" "${templatesFolder}/privacy-scan-schedule.template.json" >"${parsedPrivacyScanScheduleFileName}"

echo "Logging into batch account ${batchAccountName} in resource group ${resourceGroupName}..."
az batch account login --name "${batchAccountName}" --resource-group "${resourceGroupName}"

echo "Fetching existing job schedule list..."
allJobsScheduleList=$(az batch job-schedule list --query "[*].id" -o tsv)

adjustJob "${onDemandScanReqScheduleJobName}" "${parsedOnDemandScanReqScheduleFileName}" "${allJobsScheduleList}"
adjustJob "${privacyScanScheduleJobName}" "${parsedPrivacyScanScheduleFileName}" "${allJobsScheduleList}"

echo "Job schedules were created successfully."
