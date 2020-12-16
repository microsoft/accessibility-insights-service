#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

export resourceGroupName
export keyVault
export enableSoftDeleteOnKeyVault

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -k <enable soft delete for Azure Key Vault> -c <webApiAdClientId> -p <webApiAdClientSecret> [-e <environment>]
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

# Microsoft AAD tenant when env is not ppe or prod
objectId='f520d84c-3fd3-4cc8-88d4-2ed25b00d27a'

# PME AAD tenant when env is ppe or prod
if [ "$environment" = "prod" ] || [ "$environment" = "ppe" ]; then
    objectId='8ad17ea0-4c88-4465-b8ec-a827df84f896'
fi

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
                --parameters objectId=$objectId \
                --query "properties.outputResources[].id" \
                --parameters enableSoftDeleteOnKeyVault="$enableSoftDeleteOnKeyVault" \
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
    recoverIfSoftDeleted
    if [[ -z "$keyvaultRecovered" ]]; then
        createKeyvaultIfNotExists
    fi
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
while getopts ":r:k:c:p:e:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) enableSoftDeleteOnKeyVault=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    p) webApiAdClientSecret=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $enableSoftDeleteOnKeyVault ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]]; then
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

. "${0%/*}/push-secrets-to-key-vault.sh"

echo "The '$keyVault' Azure Key Vault account successfully deployed"
