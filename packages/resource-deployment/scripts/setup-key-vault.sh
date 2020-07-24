#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

export resourceGroupName
export keyVault
export enableSoftDeleteOnKeyVault

# Set default ARM template files
createKeyVaultTemplateFile="${0%/*}/../templates/key-vault-create.template.json"
setupKeyVaultResourcesTemplateFile="${0%/*}/../templates/key-vault-setup-resources.template.json"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -k <enable soft delete for Azure Key Vault> -c <webApiAdClientId> -p <webApiAdClientSecret>
"
    exit 1
}

. "${0%/*}/process-utilities.sh"

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
while getopts ":r:k:c:p:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    k) enableSoftDeleteOnKeyVault=${OPTARG} ;;
    c) webApiAdClientId=${OPTARG} ;;
    p) webApiAdClientSecret=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $enableSoftDeleteOnKeyVault ]] || [[ -z $webApiAdClientId ]] || [[ -z $webApiAdClientSecret ]]; then
    exitWithUsageInfo
fi

# Login to Azure account if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

createKeyvaultIfNotExists

setupKeyVaultResources

. "${0%/*}/push-secrets-to-key-vault.sh"

echo "The '$keyVault' Azure Key Vault account successfully deployed"
