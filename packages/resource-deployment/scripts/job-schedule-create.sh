#!/bin/bash
set -eo pipefail

scanReqScheduleJobName="scan-req-schedule"
scanReqScheduleFileName="final_scan-req-schedule.template.json"
urlScanScheduleJobName="url-scan-schedule"
urlScanScheduleFileName="final_url-scan-schedule.template.json"

adjustJob() {
    jobName=$1
    jobTemplate=$2
    allJobsScheduleList=$3

    if [[ ${allJobsScheduleList} == *$jobName* ]]; then
        echo "$jobName exists. Resetting job schedule"
        az batch job-schedule reset --job-schedule-id "$jobName" --json-file "$jobTemplate"
    else
        echo "$jobName doesn't exist. Creating job schedule"
        az batch job-schedule create --json-file "$jobTemplate"
    fi
}

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -n <batch account name> -r <resource group name> -a <app insights instrumentation key> -k <key vault url> -t <path to template folder>
"
    exit 1
}

# Read script arguments
while getopts "n:r:a:k:t:" option; do
    case $option in
    n) batchAccountName=${OPTARG} ;;
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

sed -e "s/%TOKEN1%/$appInstrumentationKey/" -e "s/%TOKEN2%/$keyVaultUrl/" "$templatesFolder/scan-req-schedule.template.json">"$scanReqScheduleFileName"
sed -e "s/%TOKEN1%/$appInstrumentationKey/" -e "s/%TOKEN2%/$keyVaultUrl/" "$templatesFolder/url-scan-schedule.template.json">"$urlScanScheduleFileName"

az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

allJobsScheduleList=$(az batch job-schedule list --query [*].id)

adjustJob "$scanReqScheduleJobName" "$scanReqScheduleFileName" "$allJobsScheduleList"
adjustJob "$urlScanScheduleJobName" "$urlScanScheduleFileName" "$allJobsScheduleList"