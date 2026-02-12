#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1091
set -eo pipefail

export resourceGroupName
export keyVault

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
createKeyVaultSecScanTemplateFile="${0%/*}/../templates/key-vault-sec-scan-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-b <Object ID to grant access>] [-t <key vault type: service|secscan>]
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

function assignRbacRoles() {
    local kvScope
    kvScope=$(az keyvault show --name "${keyVault}" --resource-group "${resourceGroupName}" --query "id" -o tsv)

    if [[ "${keyVaultType}" == "secscan" ]]; then
        echo "Assigning Key Vault Secrets User role to ${objectId} on ${keyVault}"
        az role assignment create \
            --role "Key Vault Secrets User" \
            --assignee "${objectId}" \
            --scope "${kvScope}" 1>/dev/null

        echo "Assigning Key Vault Reader role to ${objectId} on ${keyVault}"
        az role assignment create \
            --role "Key Vault Reader" \
            --assignee "${objectId}" \
            --scope "${kvScope}" 1>/dev/null
    else
        echo "Assigning Key Vault Secrets Officer role to ${objectId} on ${keyVault}"
        az role assignment create \
            --role "Key Vault Secrets Officer" \
            --assignee "${objectId}" \
            --scope "${kvScope}" 1>/dev/null
    fi
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
while getopts ":r:b:k:t:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    b) objectId=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    t) keyVaultType=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

. "${0%/*}/get-resource-names.sh"
. "${0%/*}/process-utilities.sh"

# Select key vault template and name based on key vault type
case ${keyVaultType} in
secscan)
    createKeyVaultTemplateFile="${createKeyVaultSecScanTemplateFile}"
    keyVault="${keyVaultSecScan}"
    ;;
service | "") ;; # use default createKeyVaultTemplateFile and keyVault
*)
    echo "Error: Invalid key vault type '${keyVaultType}'. Must be 'service' or 'secscan'."
    exitWithUsageInfo
    ;;
esac

createOrRecoverKeyvault
setupKeyVaultResources
setAccessPolicies

if [[ -n "${objectId}" ]]; then
    assignRbacRoles
fi

if [[ "${keyVaultType}" != "secscan" ]]; then
    . "${0%/*}/push-secrets-to-key-vault.sh"
fi

echo "The ${keyVault} Azure Key Vault successfully deployed."
