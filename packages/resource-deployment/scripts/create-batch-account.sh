#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

export resourceGroupName
export batchAccountName
export parameterFilePath
export dropPools
export publicIpAddressName
export dnsName

# Set default ARM template file
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -e <environment> -b <Azure Batch object ID> [-t <batch template file (optional)>] [-d <pass \"true\" to force pools to drop>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function setParameterFilePath() {
    parameterFilePath="${0%/*}/../templates/batch-account-${environment}.parameters.json"
    echo "Using configuration file ${parameterFilePath}"
}

function createPublicIp() {
    local poolName=$1

    publicIpAddressName="public-ip-${poolName}"
    dnsName="${resourceGroupSuffix}-${poolName}"

    . "${0%/*}/create-public-ip.sh"
}

function deployBatch() {
    # Deploy Azure Batch account using resource manager template
    echo "Deploying Azure Batch account in resource group ${resourceGroupName} with template ${batchTemplateFile}"
    resources=$(
        az deployment group create \
            --resource-group "${resourceGroupName}" \
            --template-file "${batchTemplateFile}" \
            --parameters "${parameterFilePath}" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Deployed Batch account ${batchAccountName}"
}

# Read script arguments
while getopts ":r:t:e:d:b:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) batchTemplateFile=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${batchTemplateFile} ]] || [[ -z ${environment} ]] || [[ -z ${azureBatchObjectId} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"

echo "Setting up batch account ${batchAccountName}"
setParameterFilePath
. "${0%/*}/enable-batch-node-identity.sh"
. "${0%/*}/delete-pools-if-needed.sh"

# Create Batch pool static public IP
createPublicIp "on-demand-scan-request-pool"
createPublicIp "on-demand-url-scan-pool"
createPublicIp "privacy-scan-pool"

deployBatch
echo "The ${batchAccountName} Azure Batch account successfully deployed."
