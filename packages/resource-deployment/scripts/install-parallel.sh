#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export apiManagementName
export batchAccountName
export cosmosAccountName
export datalakeStorageAccountName
export dropFolder="${0%/*}/../../../"
export environment
export webApiFuncAppName
export keyVault
export keyVaultUrl
export location
export resourceGroupName
export subscription
export storageAccountName
export webApiAdClientId
export webApiAdClientSecret
export templatesFolder="${0%/*}/../templates/"
export apiTemplates="$templatesFolder"rest-api-templates
export enableSoftDeleteOnKeyVault=true
export logAnalyticsWorkspaceId
export logAnalyticsWorkspaceKey

exitWithUsageInfo() {
    echo "
Usage: $0 -e <environment> -l <Azure region> -o <organisation name> -p <publisher email> -r <resource group> -s <subscription name or id> -c <client id> -t <client secret> -v <release version> -k <enable soft delete for Azure Key Vault> -w <log analytics workspace> -z <workspace key>
where:

Resource group - The name of the resource group that everything will be deployed in.
Subscription - The subscription for the resource group.
Environment - The environment in which the set up is running.
Organisation name - The name of organisation.
Publisher email - The email for notifications.
Client ID - The app registration client ID used for function app authentication.
Client Secret - The secret used to authenticate with the AD application.
Release Version - The deployment release version.
Azure region - Azure region where the instances will be deployed. Available Azure regions:
    centralus
    eastasia
    southeastasia
    eastus
    eastus2
    westus
    westus2
    northcentralus
    southcentralus
    westcentralus
    northeurope
    westeurope
    japaneast
    japanwest
    brazilsouth
    australiasoutheast
    australiaeast
    westindia
    southindia
    centralindia
    canadacentral
    canadaeast
    uksouth
    ukwest
    koreacentral
    koreasouth
    francecentral
    southafricanorth
    uaenorth
"
    exit 1
}

function waitForProcesses() {
    local processesToWaitFor=$1

    list="$processesToWaitFor[@]"
    for pid in "${!list}"; do
        echo "Waiting for process with pid $pid"
        wait $pid
        echo "Process with pid $pid exited"
    done
}

function runInParallel() {
    local processPaths=$1
    local -a parallelizableProcesses

    list="$processPaths[@]"
    for processPath in "${!list}"; do
        . "${processPath}" &
        echo "Created process with pid $! for process path - $processPath"
        parallelizableProcesses+=("$!")
    done

    waitForProcesses parallelizableProcesses
}

# Read script arguments
while getopts ":r:s:l:e:o:p:c:t:v:k:w:z:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    o) orgName=${OPTARG} ;;
    p) publisherEmail=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    t) webApiAdClientSecret=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    k) enableSoftDeleteOnKeyVault=${OPTARG} ;;
    w) logAnalyticsWorkspaceId=${OPTARG} ;;
    z) logAnalyticsWorkspaceKey=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $environment ]] || [[ -z $orgName ]] || [[ -z $publisherEmail ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]] || [[ -z $releaseVersion ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

az account set --subscription "$subscription"

. "${0%/*}/create-resource-group.sh"
. "${0%/*}/create-storage-account.sh"

resourceGroupSuffix=${storageAccountName:11}
cosmosAccountName="allycosmos$resourceGroupSuffix"
apiManagementName="apim-a11y$resourceGroupSuffix"
webApiFuncAppName="web-api-allyfuncapp$resourceGroupSuffix"
appInsightsName="allyinsights$resourceGroupSuffix"

echo "Starting parallel processes.."

. "${0%/*}/create-api-management.sh" &
apiManagmentProcess="$!"

parallelProcesses=(
    # "${0%/*}/create-datalake-storage-account.sh"
    "${0%/*}/upload-files.sh"
    "${0%/*}/create-queues.sh"
    "${0%/*}/setup-cosmos-db.sh"
    "${0%/*}/create-vnet.sh"
    "${0%/*}/app-insights-create.sh"
)
runInParallel parallelProcesses

# The following scripts all depend on the result from the above scripts.
# Additionally, these should run sequentially because of interdependence.

. "${0%/*}/batch-account-create.sh"
. "${0%/*}/push-secrets-to-key-vault.sh"

parallelProcesses=(
    "${0%/*}/function-app-create.sh"
    "${0%/*}/job-schedule-create.sh"
)
runInParallel parallelProcesses

waitForProcesses apiManagmentProcess

parallelProcesses=(
    "${0%/*}/deploy-rest-api.sh"
    "${0%/*}/create-dashboard.sh"
)
runInParallel parallelProcesses
