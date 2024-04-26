#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Еxport variables to all child processes
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
Azure Batch object ID - The Azure AD object ID for Microsoft Azure Batch enterprise application, application ID ddbf3205-c6bd-46ae-8127-60eb93363864
Release Version - The deployment release version.
Azure region - The deployment location.
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

onExit-install() {
    local exitCode=$?
    local command="$BASH_COMMAND"

    if [[ ${exitCode} != 0 ]]; then
        echo "Script: $command"
        echo "Call stack:"

        local i
        for ((i = 1; i < ${#FUNCNAME[*]}; i++)); do
            echo "  at ${FUNCNAME[$i]} (${BASH_SOURCE[$i]}:${BASH_LINENO[$i - 1]})"
        done

        killDescendantProcesses $$

        echo "Installation failed with exit code $exitCode"
        echo "Deployments that already were triggered could still be running. To kill them, you may need to goto the Azure portal and cancel corresponding deployment."
    else
        echo "Installation completed with exit code $exitCode"
    fi

    exit "${exitCode}"
}

trap 'onExit-install' EXIT

# Read script arguments
while getopts ":r:s:l:e:o:p:b:v:d:w:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    l) location=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    o) orgName=${OPTARG} ;;
    p) publisherEmail=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    v) releaseVersion=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
    w) keepImages=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $subscription ]] || [[ -z $location ]] || [[ -z $environment ]] || [[ -z $orgName ]] || [[ -z $publisherEmail ]] || [[ -z $azureBatchObjectId ]] || [[ -z $releaseVersion ]]; then
    exitWithUsageInfo
fi

function versionToNumber() {
    local versionStr=$1

    local temp="${versionStr/./}"
    versionNum="${temp/./}"
}

function validateAzCliVersion() {
    local azVersionMinimum="2.52.0"

    local azVersionCurrent=$(az version --query '"azure-cli"' -o tsv)
    versionToNumber $azVersionCurrent
    local azVersionCurrentNum=$versionNum

    versionToNumber $azVersionMinimum
    local azVersionMinimumNum=$versionNum

    if [ "$azVersionCurrentNum" -lt "$azVersionMinimumNum" ]; then
        echo "Expected Azure CLI version $azVersionMinimum or newer. Current Azure CLI version is $azVersionCurrent. How to update the Azure CLI, see https://learn.microsoft.com/en-us/cli/azure/update-azure-cli"
        exit 1
    fi

    echo "Azure CLI version $azVersionCurrent"
}

function validateJqTool() {
    local jqVersion=$(jq --version 2>/dev/null) || true
    if [[ -z $jqVersion ]]; then
        echo "Expected jq tool to be installed on a machine. How to install jq tool, see https://jqlang.github.io/jq/download/"
        exit 1
    fi

    echo "jq tool version $jqVersion"
}

function validateDotnetSdk() {
    local dotnetSdk=$(dotnet --list-sdks 2>/dev/null) || true
    if [[ -z $dotnetSdk ]]; then
        echo "Expected .Net SDK to be installed on a machine. How to install .Net SDK, see https://dotnet.microsoft.com/en-us/download"
        exit 1
    fi

    printf ".Net SDK version\n$dotnetSdk\n"
}

function validateAzureFunctionsCoreTools() {
    local funcVersion=$(func version 2>/dev/null) || true
    if [[ -z $funcVersion ]]; then
        local kernelName=$(uname -s 2>/dev/null) || true
        if [[ ${kernelName} == "Linux" ]]; then
            echo "Azure Functions Core Tools is not detected on a machine and will be installed by the deployment script."
        else
            echo "Azure Functions Core Tools is expected to be installed on a machine. How to install tool, see https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local"
            exit 1
        fi
    else
        echo "Azure Functions Core Tools version $funcVersion"
    fi
}

function install() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "$subscription"

    . "${0%/*}/create-resource-group.sh"
    . "${0%/*}/wait-for-pending-deployments.sh"
    . "${0%/*}/create-storage-account.sh"
    . "${0%/*}/create-managed-identity.sh"
    . "${0%/*}/deploy-e2e-test-site.sh"

    echo "Starting parallel processes..."

    . "${0%/*}/create-api-management.sh" &
    apiManagmentProcessId="$!"

    parallelProcesses=(
        "${0%/*}/upload-files.sh"
        "${0%/*}/create-queues.sh"
        "${0%/*}/create-cosmos-db.sh"
        "${0%/*}/create-vnet.sh"
        "${0%/*}/app-insights-create.sh"
        "${0%/*}/create-container-registry.sh"
    )
    runCommandsWithoutSecretsInParallel parallelProcesses

    # The following scripts all depend on the result from the above scripts.
    # Additionally, these should run sequentially because of interdependence.

    . "${0%/*}/create-key-vault.sh"
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

validateAzCliVersion
validateJqTool
validateDotnetSdk
validateAzureFunctionsCoreTools
install
echo "Installation completed"
