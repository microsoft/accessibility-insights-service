#!/bin/bash

set -e

baseDir=$(dirname "$0")
source $baseDir/.secrets

export jobManagerContainerName="batch-job-manager-script"
export runnerContainerName="batch-runner-script"
export scanRequestSenderContainerName="batch-scan-request-sender-script"
export poolStartupContainerName="batch-pool-startup-script"
export AZURE_STORAGE_CONNECTION_STRING=$AZURE_STORAGE_CONNECTION_STRING

echo "Uploading files to blob"
az storage blob upload-batch --destination $jobManagerContainerName --source "$baseDir/../../job-manager/dist" --pattern "*[!*.map]"

az storage blob upload-batch --destination $runnerContainerName --source "$baseDir/../../runner/dist" --pattern "*[!*.map]"

az storage blob upload-batch --destination $scanRequestSenderContainerName --source "$baseDir/../../scan-request-sender/dist" --pattern "*[!*.map]"

az storage blob upload-batch --destination $poolStartupContainerName --source "$baseDir/../resource-scripts/pool-startup" --pattern "*[!*.map]"

echo "Successfully uploaded files to blob"
