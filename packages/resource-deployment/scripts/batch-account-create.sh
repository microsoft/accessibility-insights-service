#!/bin/bash
set -eo pipefail

# This script will deploy Azure Batch account in user subscription mode
# and enable managed identity for Azure on Batch pools

# Set default ARM Batch account template files
batchTemplateFile="./templates/batch-account.template.json"
batchTemplateParametersFile="./templates/batch-account.parameters.json"

# Read script arguments
while getopts "s:r:t:p:" option; do
case $option in
    s) subscription=${OPTARG};;
    r) resourceGroup=${OPTARG};;
    t) batchTemplateFile=${OPTARG};;
    p) batchTemplateParametersFile=${OPTARG};;
esac
done

# Print script usage help
if [[ -z $subscription ]] || [[ -z $resourceGroup ]]; then
    echo \
"
Usage: $0 -s <subscription> -r <resource group> [-t <batch template file>] [-p <batch template parameters file>]
"
    exit 0
fi

# Login to Azure if required
az account show 1> /dev/null
if [ $? != 0 ]; then
    az login
fi

# Set default Azure subscription
echo "Switching to '$subscription' Azure subscription"
az account set --subscription $subscription

# Configure Azure subscription account to support Batch account in user subscription mode
source ${0%/*}/account-set-batch-app.sh

# Deploy Azure Batch account using resource manager template
echo "Deploying Azure Batch account"
resources=$(az group deployment create \
    --resource-group $resourceGroup \
    --template-file $batchTemplateFile \
    --parameters $batchTemplateParametersFile \
    --query "properties.outputResources[].id" \
    -o tsv)

# Get key vault and batch account resources
batchAccountRegEx="^/subscriptions/$subscription/resourceGroups/$resourceGroup/providers/Microsoft.Batch/batchAccounts/(.[^/]+)"
keyVaultRegEx="^/subscriptions/$subscription/resourceGroups/$resourceGroup/providers/Microsoft.KeyVault/vaults/(.[^/]+)"
for resource in $resources
do
    if [[ $resource =~ $batchAccountRegEx ]]; then
        account="${BASH_REMATCH[1]}"
    fi
    
    if [[ $resource =~ $keyVaultRegEx ]]; then
        keyVault="${BASH_REMATCH[1]}"
    fi
done
echo "The '$account' Azure Batch account deployed successfully"

# Login into Azure Batch account
echo "Logging into '$account' Azure Batch account"
az batch account login --name $account --resource-group $resourceGroup

export vmssResourceGroup
export vmssName
export systemAssignedIdentity

# Enable managed identity on Batch pools
pools=$(az batch pool list --query "[].id" -o tsv)
for pool in $pools
do
    source ${0%/*}/batch-pool-enable-msi.sh
    source ${0%/*}/key-vault-enable-msi.sh
done
