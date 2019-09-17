#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export batchAccountName
export resourceGroupName
export appInsightsKey
export keyVaultUrl
export templatesFolder

templatesFolder="${0%/*}/../templates/"

scanReqScheduleJobName="scan-req-schedule"
parsedScanReqScheduleFileName="scan-req-schedule.generated.template.json"

onDemandScanReqScheduleJobName="on-demand-scan-req-schedule"
parsedOnDemandScanReqScheduleFileName="on-demand-scan-req-schedule.generated.template.json"

urlScanScheduleJobName="url-scan-schedule"
parsedUrlScanScheduleFileName="url-scan-schedule.generated.template.json"

adjustJob() {
    local jobName=$1
    local jobTemplate=$2
    local allJobsScheduleList=$3
    local foundJobSchedule=false

    for currentSchedule in $allJobsScheduleList; do
        if [[ $currentSchedule == "$jobName" ]]; then
            foundJobSchedule=true
            break
        fi
    done

    if [[ $foundJobSchedule == true ]]; then
        echo "The '$jobName' job schedule exists. Resetting job schedule."
        az batch job-schedule reset --job-schedule-id "$jobName" --json-file "$jobTemplate" 1>/dev/null
    else
        echo "The '$jobName' job schedule doesn't exist. Creating job schedule."
        az batch job-schedule create --json-file "$jobTemplate" 1>/dev/null
    fi
}

exitWithUsageInfo() {
    echo "
        Usage: $0 -b <batch account name> -r <resource group name> -a <app insights instrumentation key> -k <key vault url> -t <path to template folder (optional), defaults to '$templatesFolder' folder relative to the current working directory>
    "
    exit 1
}

# Read script arguments
while getopts "b:r:a:k:t:" option; do
    case $option in
    b) batchAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    a) appInsightsKey=${OPTARG} ;;
    k) keyVaultUrl=${OPTARG} ;;
    t) templatesFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $batchAccountName ]] || [[ -z $resourceGroupName ]] || [[ -z $appInsightsKey ]] || [[ -z $keyVaultUrl ]] || [[ -z $templatesFolder ]]; then
    exitWithUsageInfo
fi

sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/scan-req-schedule.template.json" >"$parsedScanReqScheduleFileName"
sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/url-scan-schedule.template.json" >"$parsedUrlScanScheduleFileName"

sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/on-demand-scan-req-schedule.template.json" >"$parsedOnDemandScanReqScheduleFileName"

echo "Logging into batch account '$batchAccountName' in resource group '$resourceGroupName'..."
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

echo "Fetching existing job schedule list..."
allJobsScheduleList=$(az batch job-schedule list --query "[*].id" -o tsv)

adjustJob "$scanReqScheduleJobName" "$parsedScanReqScheduleFileName" "$allJobsScheduleList"
adjustJob "$urlScanScheduleJobName" "$parsedUrlScanScheduleFileName" "$allJobsScheduleList"

adjustJob "$onDemandScanReqScheduleJobName" "$parsedOnDemandScanReqScheduleFileName" "$allJobsScheduleList"

echo "Job schedules were created successfully."
