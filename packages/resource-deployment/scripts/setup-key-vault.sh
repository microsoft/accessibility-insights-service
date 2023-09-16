#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export keyVault

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -k <enable soft delete for Azure Key Vault> -c <webApiAdClientId> -p <webApiAdClientSecret> [-e <environment>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

function recoverIfSoftDeleted() {
    softDeleted=$(az keyvault list-deleted --resource-type vault --query "[?name=='$keyVault'].id" -o tsv)
    if [[ -n "$softDeleted" ]]; then
        echo "Keyvault $keyVault is in soft-deleted state and will be recovered."
        echo "To recreate $keyVault without recovery, delete and purge the keyvault before running this script."

        az keyvault recover --name "$keyVault" 1>/dev/null

        echo "Keyvault $keyVault was successfully recovered"
        keyvaultRecovered=true
    fi
}

function createKeyvaultIfNotExists() {
    local existingResourceId=$(
        az keyvault list \
            --query "[?name=='$keyVault'].id|[0]" \
            -o tsv
    )
    if [[ -z $existingResourceId ]]; then
        echo "Key vault does not exist. Creating using ARM template."
        resources=$(
            az deployment group create \
                --resource-group "$resourceGroupName" \
                --template-file "$createKeyVaultTemplateFile" \
                --parameters objectId="$azureBatchObjectId" \
                --query "properties.outputResources[].id" \
                -o tsv
        )

        echo "Created Key vault:
            resource: $resources
        "
    else
        echo "Key vault already exists. Skipping Key vault creation using ARM template"
    fi
}

function createOrRecoverKeyvault() {
    # recoverIfSoftDeleted
    if [[ -z "$keyvaultRecovered" ]]; then
        createKeyvaultIfNotExists
    fi
}

function setAccessPolicies() {
    az keyvault update --name $keyVault --resource-group $resourceGroupName --enabled-for-disk-encryption "true" 1>/dev/null
    az keyvault update --name $keyVault --resource-group $resourceGroupName --enabled-for-deployment "true" 1>/dev/null
    az keyvault update --name $keyVault --resource-group $resourceGroupName --enabled-for-template-deployment "true" 1>/dev/null
}

function setupKeyVaultResources() {
    echo "Setting up key vault resources using ARM template."
    resources=$(
        az deployment group create \
            --resource-group "$resourceGroupName" \
            --template-file "$setupKeyVaultResourcesTemplateFile" \
            --query "properties.outputResources[].id" \
            -o tsv
    )

    echo "Successfully setup Key vault resources:
            resource: $resources
        "
}

# Read script arguments
while getopts ":r:c:p:b:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    p) webApiAdClientSecret=${OPTARG} ;;
    b) azureBatchObjectId=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]] || [[ -z $azureBatchObjectId ]]; then
    exitWithUsageInfo
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

createOrRecoverKeyvault

setupKeyVaultResources

setAccessPolicies

. "${0%/*}/push-secrets-to-key-vault.sh"

echo "The '$keyVault' Azure Key Vault account successfully deployed"
