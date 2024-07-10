#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

export resourceGroupName
export keyVault

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -c <web API client ID> -b <Azure Batch object ID> [-e <environment>]
"
    exit 1
}

function recoverIfSoftDeleted() {
    softDeleted=$(az keyvault list-deleted --resource-type vault --query "[?name=='${keyVault}'].id" -o tsv)
    if [[ -n "${softDeleted}" ]]; then
        echo "Key vault ${keyVault} is in soft-deleted state and will be recovered."
        echo "To recreate ${keyVault} without recovery, delete and purge the key vault before running this script."

        az keyvault recover --name "${keyVault}" 1>/dev/null

        echo "Key vault ${keyVault} was successfully recovered."
        keyvaultRecovered=true
    fi
}

function createKeyVaultIfNotExists() {
    local existingResourceId

    existingResourceId=$(
        az keyvault list \
            --query "[?name=='${keyVault}'].id|[0]" \
            -o tsv
    )

    if [[ -z ${existingResourceId} ]]; then
        echo "Creating new key vault ${keyVault}"

        az deployment group create \
            --resource-group "${resourceGroupName}" \
            --template-file "${createKeyVaultTemplateFile}" \
            --parameters objectId="${azureBatchObjectId}" \
            --query "properties.outputResources[].id" \
            -o tsv 1>/dev/null

        echo "Created key vault ${keyVault}"
    else
        echo "Key vault ${keyVault} already exists."
    fi
}

function createOrRecoverKeyvault() {
    # recoverIfSoftDeleted
    if [[ -z "${keyvaultRecovered}" ]]; then
        createKeyVaultIfNotExists
    fi
}

function setAccessPolicies() {
    echo "Setup key vault policies."
    az keyvault update --name "${keyVault}" --resource-group "${resourceGroupName}" \
        --enabled-for-disk-encryption "true" \
        --enabled-for-deployment "true" \
        --enabled-for-template-deployment "true" \
        --enable-rbac-authorization "true" 1>/dev/null
}

function setupKeyVaultResources() {
    echo "Setup key vault resources."
    az deployment group create \
        --resource-group "${resourceGroupName}" \
        --template-file "${setupKeyVaultResourcesTemplateFile}" \
        --query "properties.outputResources[].id" \
        -o tsv 1>/dev/null
}

# Read script arguments
while getopts ":r:b:e:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]] || [[ -z ${azureBatchObjectId} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="dev"
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

createOrRecoverKeyvault
setupKeyVaultResources
setAccessPolicies
. "${0%/*}/push-secrets-to-key-vault.sh"

echo "The ${keyVault} Azure Key Vault successfully deployed."
