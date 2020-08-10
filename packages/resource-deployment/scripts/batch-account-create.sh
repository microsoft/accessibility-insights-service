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

# Set default ARM template file
batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -e <environment> [-t <batch template file (optional)>] [-d <pass \"true\" to force pools to drop>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

getContainerRegistryLoginCredentials() {
    containerRegistryUsername=$(az acr credential show --name "$containerRegistryName" --query "username" -o tsv)
    containerRegistryPassword=$(az acr credential show --name "$containerRegistryName" --query "passwords[0].value" -o tsv)

    if [[ -z $containerRegistryUsername ]] || [[ -z $containerRegistryPassword ]]; then
        echo "Unable to get login credentials for container registry $containerRegistryName"
        exit 1
    fi
}

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
            --parameters "$parameterFilePath" \
            --parameters containerRegistryServerUserName=$containerRegistryUsername \
            --parameters containerRegistryServerPassword=$containerRegistryPassword \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Deployed Batch account :
        resources: $resources
    "
}

# Read script arguments
while getopts ":r:t:e:d:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) batchTemplateFile=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    d) dropPools=${OPTARG} ;;
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
. "${0%/*}/enable-batch-provider.sh"

setParameterFilePath

. "${0%/*}/delete-pools-if-needed.sh"

getContainerRegistryLoginCredentials
deployBatch

. "${0%/*}/setup-all-pools-for-batch.sh"

echo "The '$batchAccountName' Azure Batch account successfully deployed"
