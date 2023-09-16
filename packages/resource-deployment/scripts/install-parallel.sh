#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export apiManagementName
export batchAccountName
export cosmosAccountName
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
export azureBatchObjectId
export releaseVersion
export templatesFolder="${0%/*}/../templates/"
export dropFolder="${0%/*}/../../../"
export dropPools=false
export keepImages=false

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE}
-e <environment>
-l <Azure region>
-o <organisation name>
-p <publisher email>
-r <resource group>
-s <subscription name or ID>
-c <client ID>
-t <client secret>
-v <release version>
-b <Azure Batch object ID>
[-d <pass \"true\" to force VM pools to drop>]
[-w <pass \"true\" to preserve docker images in Azure Container Registry>]

Where:

Resource group - The name of the resource group.
Subscription - The Azure subscription name or ID.
Environment - The deployment environment. Supported values dev, prod.
Organization name - The name of organization.
Publisher email - The notification email.
Client ID - The REST API OAuth2 client ID.
Client Secret - The REST API OAuth2 client secret.
Azure Batch object ID - The Azure AD object ID for Microsoft Azure Batch enterprise application, application ID ddbf3205-c6bd-46ae-8127-60eb93363864
Release Version - The deployment release version.
Azure region - The deployment location.
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

onExit-install() {
    local exitCode=$?

    if [[ ${exitCode} != 0 ]]; then
        echo "Installation failed with exit code ${exitCode}"
        killDescendantProcesses $$
        echo "WARN: Deployments that already were triggered could still be running. To kill them, you may need to goto the Azure portal and cancel corresponding deployment."
    else
        echo "Installation completed with exit code ${exitCode}"
    fi

    exit "${exitCode}"
}

trap 'onExit-install' EXIT

# Read script arguments
while getopts ":r:s:l:e:o:p:c:t:b:v:d:w:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    o) orgName=${OPTARG} ;;
    p) publisherEmail=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    t) webApiAdClientSecret=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
    w) keepImages=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $location ]] || [[ -z $environment ]] || [[ -z $orgName ]] || [[ -z $publisherEmail ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]] || [[ -z $azureBatchObjectId ]] || [[ -z $releaseVersion ]]; then
    exitWithUsageInfo
fi

function install() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "$subscription"

    . "${0%/*}/create-resource-group.sh"
    . "${0%/*}/wait-for-pending-deployments.sh"
    . "${0%/*}/create-storage-account.sh"
    . "${0%/*}/get-resource-names.sh"
    . "${0%/*}/deploy-e2e-test-site.sh"

    echo "Starting parallel processes..."

    . "${0%/*}/create-api-management.sh" &
    apiManagmentProcessId="$!"

    parallelProcesses=(
        "${0%/*}/upload-files.sh"
        "${0%/*}/create-queues.sh"
        "${0%/*}/setup-cosmos-db.sh"
        "${0%/*}/create-vnet.sh"
        "${0%/*}/app-insights-create.sh"
        "${0%/*}/create-container-registry.sh"
    )
    runCommandsWithoutSecretsInParallel parallelProcesses

    # The following scripts all depend on the result from the above scripts.
    # Additionally, these should run sequentially because of interdependence.

    . "${0%/*}/setup-key-vault.sh"
    . "${0%/*}/push-image-to-container-registry.sh"
    . "${0%/*}/create-batch-account.sh"
    . "${0%/*}/create-job-schedule.sh"
    . "${0%/*}/create-function-app.sh"

    . "${0%/*}/create-dashboard.sh" &
    dashboardProcessId="$!"

    echo "Waiting for API Management service deployment completion"
    waitForProcesses apiManagmentProcessId
    echo "Deploying REST API configuration to API Management service"
    . "${0%/*}/deploy-rest-api.sh"

    echo "Waiting for dashboard deployment completion"
    waitForProcesses dashboardProcessId
}

install
echo "Installation completed"
