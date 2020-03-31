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

# Set default ARM Batch account template files
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -e <environment> [-t <batch template file (optional)>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function setParameterFilePath() {
    if [ $environment = "prod" ] || [ $environment = "ppe" ]; then
        parameterFilePath="${0%/*}/../templates/batch-account-prod.parameters.json"
    else
        parameterFilePath="${0%/*}/../templates/batch-account-dev.parameters.json"
    fi
}

function deployBatch() {
    # Deploy Azure Batch account using resource manager template
    echo "Deploying Azure Batch account in resource group $resourceGroupName with template $batchTemplateFile"
    resources=$(
        az deployment group create \
            --resource-group "$resourceGroupName" \
            --template-file "$batchTemplateFile" \
            --query "properties.outputResources[].id" \
            --parameters "$parameterFilePath" \
            -o tsv
    )

    echo "Deployed Batch account :
        resources: $resources
    "
}

# Read script arguments
while getopts ":r:t:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) batchTemplateFile=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done


# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $batchTemplateFile ]] || [[ -z $environment ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

echo "Setting up batch account $batchAccountName"

# Configure Azure subscription account to support Batch account in user subscription mode
. "${0%/*}/account-set-batch-app.sh"

setParameterFilePath

. "${0%/*}/recreate-vmss-for-pools.sh"

deployBatch

. "${0%/*}/setup-all-pools-for-batch.sh"

echo "The '$batchAccountName' Azure Batch account successfully deployed"

