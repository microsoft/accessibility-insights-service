#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

export resourceGroupName
export containerRegistryName

# Set default ARM Batch account template files
containerTemplateFile="${0%/*}/../templates/container-registry.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-t <container template file (optional)>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function deployContainer() {
    # Deploy Azure Batch account using resource manager template
    echo "Deploying Azure Container registry in resource group $resourceGroupName with template $batchTemplateFile"
    resources=$(
        az deployment group create \
            --resource-group "$resourceGroupName" \
            --template-file "$containerTemplateFile" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Deployed Batch account :
        resources: $resources
    "
}

# Read script arguments
while getopts ":r:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) containerTemplateFile=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done


# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $containerTemplateFile ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

echo "Setting up container registry $containerRegistryName"

deployContainer

echo "The '$containerRegistryName' Azure Container registry successfully deployed"

# Login to Azure container
az acr login -n $containerRegistryName

echo "Building the web api scan runner image to the $containerRegistryName container registry"

# Change directory to the function app scripts folder
cd "${0%/*}/../../docker-images-config/web-api-scan-runner"

az acr build --image webapiscanrunner:latest --registry $containerRegistryName --file Dockerfile .

echo "The webapiscanrunner:latest image was pushed successfully to the  $containerRegistryName Azure Container registry"

