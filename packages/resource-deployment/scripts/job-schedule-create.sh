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

onDemandSendNotificationJobName="on-demand-send-notification-schedule"
parsedOnDemandSendNotificationFileName="on-demand-send-notification.generated.template.json"

onDemandScanScheduleJobName="on-demand-url-scan-schedule"
parsedOnDemandScanScheduleFileName="on-demand-url-scan-schedule.generated.template.json"

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
        Usage: $0 -b <batch account name> -r <resource group name> [-k <key vault url>] [-t <path to template folder (optional), defaults to '$templatesFolder' folder relative to the current working directory>]
    "
    exit 1
}

# Read script arguments
while getopts ":r:k:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) keyVaultUrl=${OPTARG} ;;
    t) templatesFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

if [[ -z $keyVaultUrl ]]; then
    echo "Resolving Key Vault URL for Key Vault $keyVault..."
    keyVaultUrl=$(az keyvault show --name "$keyVault" --resource-group "$resourceGroupName" --query "properties.vaultUri" -o tsv)
    if [[ -z "$keyVaultUrl" ]]; then
        echo "could not find keyvault in resource group $resourceGroupName"
        exitWithUsageInfo
    fi
    echo "  Key Vault URL $keyVaultUrl"
fi

appInsightsKey=$(az monitor app-insights component show --app "$appInsightsName" --resource-group "$resourceGroupName" --query "instrumentationKey" -o tsv)

sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/on-demand-url-scan-schedule.template.json" >"$parsedOnDemandScanScheduleFileName"
sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/on-demand-scan-req-schedule.template.json" >"$parsedOnDemandScanReqScheduleFileName"
sed -e "s@%APP_INSIGHTS_TOKEN%@$appInsightsKey@" -e "s@%KEY_VAULT_TOKEN%@$keyVaultUrl@" "$templatesFolder/on-demand-send-notification-schedule.template.json" >"$parsedOnDemandSendNotificationFileName"

echo "Logging into batch account '$batchAccountName' in resource group '$resourceGroupName'..."
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

echo "Fetching existing job schedule list..."
allJobsScheduleList=$(az batch job-schedule list --query "[*].id" -o tsv)

adjustJob "$onDemandScanScheduleJobName" "$parsedOnDemandScanScheduleFileName" "$allJobsScheduleList"
adjustJob "$onDemandScanReqScheduleJobName" "$parsedOnDemandScanReqScheduleFileName" "$allJobsScheduleList"
adjustJob "$onDemandSendNotificationJobName" "$parsedOnDemandSendNotificationFileName" "$allJobsScheduleList"

echo "Job schedules were created successfully."
