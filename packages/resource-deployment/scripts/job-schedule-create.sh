#!/bin/bash
set -eo pipefail

scanReqScheduleJobName="scan-req-schedule"
parsedScanReqScheduleFileName="final_scan-req-schedule.template.json"
urlScanScheduleJobName="url-scan-schedule"
parsedUrlScanScheduleFileName="final_url-scan-schedule.template.json"

adjustJob() {
    local jobName=$1
    local jobTemplate=$2
    local allJobsScheduleList=$3

    if [[ ${allJobsScheduleList} == *$jobName* ]]; then
        echo "$jobName exists. Resetting job schedule"
        az batch job-schedule reset --job-schedule-id "$jobName" --json-file "$jobTemplate"
    else
        echo "$jobName doesn't exist. Creating job schedule"
        az batch job-schedule create --json-file "$jobTemplate"
    fi
}

exitWithUsageInfo() {
    echo "
        Usage: $0 -b <batch account name> -r <resource group name> -a <app insights instrumentation key> -k <key vault url> -t <path to template folder>
    "
    exit 1
}

# Read script arguments
while getopts "b:r:a:k:t:" option; do
    case $option in
    b) batchAccountName=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    a) appInstrumentationKey=${OPTARG} ;;
    k) keyVaultUrl=${OPTARG} ;;
    t) templatesFolder=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $batchAccountName ]] || [[ -z $resourceGroupName ]] || [[ -z $appInstrumentationKey ]] || [[ -z $keyVaultUrl ]] || [[ -z $templatesFolder ]]; then
    exitWithUsageInfo
fi

sed -e "s/%APP_INSIGHTS_TOKEN%/$appInstrumentationKey/" -e "s/%KEY_VAULT_TOKEN%/$keyVaultUrl/" "$templatesFolder/scan-req-schedule.template.json">"$parsedScanReqScheduleFileName"
sed -e "s/%APP_INSIGHTS_TOKEN%/$appInstrumentationKey/" -e "s/%KEY_VAULT_TOKEN%/$keyVaultUrl/" "$templatesFolder/url-scan-schedule.template.json">"$parsedUrlScanScheduleFileName"

az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

allJobsScheduleList=$(az batch job-schedule list --query "[*].id")

adjustJob "$scanReqScheduleJobName" "$parsedScanReqScheduleFileName" "$allJobsScheduleList"
adjustJob "$urlScanScheduleJobName" "$parsedUrlScanScheduleFileName" "$allJobsScheduleList"