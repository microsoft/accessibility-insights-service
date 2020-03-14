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
export releaseVersion
export templatesFolder="${0%/*}/../templates/"
export apiTemplates="$templatesFolder"rest-api-templates
export enableSoftDeleteOnKeyVault=true

exitWithUsageInfo() {
    echo "
Usage: $0 -e <environment> -l <Azure region> -o <organisation name> -p <publisher email> -r <resource group> -s <subscription name or id> -c <client id> -t <client secret> -v <release version> -k <enable soft delete for Azure Key Vault>
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

. "${0%/*}/process-utilities.sh"

function onError() {
    echo "insiden on error"
    exit 1
}

function onExit {
    local exitCode=$?

    if [[ $exitCode != 0 ]]; then
        echo "Installation failed with exit code $exitCode" 
        echo "Killing all descendent processes"
        killDescendentProcesses $$
        echo "Killed all descendent processes"
        echo "WARN: ARM deployments already triggered could still still be running. To kill them, you may need to goto the azure portal & cancel them."
    else
        echo "Installation completed with exit code $exitCode"
    fi

    exit $exitCode
}

trap "onExit" EXIT

# Read script arguments
while getopts ":r:s:l:e:o:p:c:t:v:k:" option; do
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
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $location ]] || [[ -z $environment ]] || [[ -z $orgName ]] || [[ -z $publisherEmail ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]] || [[ -z $releaseVersion ]]; then
    exitWithUsageInfo
fi

function install() {
    
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "$subscription"

    . "${0%/*}/create-resource-group.sh"
    . "${0%/*}/create-storage-account.sh"

    . "${0%/*}/get-resource-names.sh"

    echo "Starting parallel processes.."

    . "${0%/*}/create-api-management.sh" &
    apiManagmentProcessId="$!"

    parallelProcesses=(
        # "${0%/*}/create-datalake-storage-account.sh"
        "${0%/*}/upload-files.sh"
        "${0%/*}/create-queues.sh"
        "${0%/*}/setup-cosmos-db.sh"
        "${0%/*}/create-vnet.sh"
        "${0%/*}/app-insights-create.sh"
    )
    runCommandsWithoutSecretsInParallel parallelProcesses
    echo "still continuing"

    # The following scripts all depend on the result from the above scripts.
    # Additionally, these should run sequentially because of interdependence.

    . "${0%/*}/setup-key-vault.sh"

    parallelProcesses=(
        "\"${0%/*}/batch-account-create.sh\" ; \"${0%/*}/job-schedule-create.sh\""
        "${0%/*}/function-app-create.sh"
    )
    echo "Waiting for batch & function app setup processes"
    runCommandsWithoutSecretsInParallel parallelProcesses

    asyncProcessIds=()

    . "${0%/*}/create-dashboard.sh" &
    asyncProcessIds+=("$!")

    . "${0%/*}/recreate-vmss-for-pools.sh" &
    asyncProcessIds+=("$!")

    echo "Waiting for api management creation process"
    waitForProcesses apiManagmentProcessId

    echo "Deploying rest api to apim"
    . "${0%/*}/deploy-rest-api.sh"

    echo "Waiting for create dashboard & recreating pools processes"
    waitForProcesses asyncProcessIds
}

install || onError
echo "Installation completed."
