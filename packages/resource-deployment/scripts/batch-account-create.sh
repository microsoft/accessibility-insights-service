#!/bin/bash
# shellcheck disable=SC1090
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

# Set default ARM Batch account template files

batchTemplateFile="${0%/*}/../templates/batch-account.template.json"

exitWithUsageInfo() {
    echo \
        "
Usage: $0 -r <resource group> [-t <batch template file (optional)>]
"
    exit 1
}

# Read script arguments
while getopts "r:t:" option; do
    case $option in
    r) resourceGroupName=${OPTARG} ;;
    t) batchTemplateFile=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $resourceGroupName ]] || [[ -z $batchTemplateFile ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Configure Azure subscription account to support Batch account in user subscription mode
. "${0%/*}/account-set-batch-app.sh"

# Deploy Azure Batch account using resource manager template
echo "Deploying Azure Batch account"
resources=$(az group deployment create \
    --resource-group "$resourceGroupName" \
    --template-file "$batchTemplateFile" \
    --query "properties.outputResources[].id" \
    -o tsv)

export keyVault
export systemAssignedIdentity
export batchAccountName
export pool

# Get key vault and batch account resources
resourceName=""
# shellcheck disable=SC1090
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.KeyVault/vaults" -r "$resources"
keyVault="$resourceName"

resourceName=""
# shellcheck disable=SC1090
. "${0%/*}/get-resource-name-from-resource-paths.sh" -p "Microsoft.Batch/batchAccounts" -r "$resources"
batchAccountName="$resourceName"

if [[ -z $batchAccountName ]] || [[ -z $keyVault ]]; then
    echo "unable to get resource information from batch creation"
    exit 1
fi

echo "The '$batchAccountName' Azure Batch account deployed successfully"

# Login into Azure Batch account
echo "Logging into '$batchAccountName' Azure Batch account"
az batch account login --name "$batchAccountName" --resource-group "$resourceGroupName"

# Enable managed identity on Batch pools
pools=$(az batch pool list --query "[].id" -o tsv)
for pool in $pools; do
    . "${0%/*}/batch-pool-enable-msi.sh"
    . "${0%/*}/key-vault-enable-msi.sh"

    # Enable VMSS access to resource group that contains external Azure services Batch tasks depend on
    echo "Granting access to the resource group '$resourceGroupName' for managed identity '$systemAssignedIdentity'"
    az role assignment create --role "Contributor" --resource-group "$resourceGroupName" --assignee-object-id "$systemAssignedIdentity" 1>/dev/null
done
