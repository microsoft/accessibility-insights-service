#!/bin/bash
set -eo pipefail
IFS=$'\n\t'

# Set default ARM Batch account template files
batchTemplateFile="./templates/batch-account.template.json"
batchTemplateParametersFile="./templates/batch-account.parameters.json"

# Read script arguments
while getopts "s:r:a:p:k:" option; do
case $option in
    s) subscription=${OPTARG};;
    r) resourceGroup=${OPTARG};;
    a) account=${OPTARG};;
    k) keyVault=${OPTARG};;
    t) batchTemplateFile=${OPTARG};;
    p) batchTemplateParametersFile=${OPTARG};;
esac
done

# Print script usage help
if [[ -z $subscription ]] || [[ -z $resourceGroup ]]  || [[ -z $account ]] || [[ -z $keyVault ]]; then
    echo \
"
Usage: $0 -s <subscription> -r <resource group> -a <batch account> -k <key vault> [-t <batch template file>] [-p <batch template parameters file>]

Prerequisites:
    Azure Key Vault
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

# Configure Azure subscription account to support Batch in user subscription mode
source ${0%/*}/account-set-batch-app.sh

echo "Creating '$account' Azure Batch account"
az group deployment create --resource-group $resourceGroup --template-file $batchTemplateFile --parameters $batchTemplateParametersFile 1> /dev/null

# Login into '$account' Azure Batch account
echo "Logging into '$account' Azure Batch account"
az batch account login --name $account --resource-group $resourceGroup

export vmssResourceGroup
export vmssName
export systemAssignedIdentity

# Enable managed identity for all Batch pools
pools=$(az batch pool list --query "[].id" -o tsv)
for pool in $pools
do
    source ${0%/*}/batch-pool-enable-msi.sh
    source ${0%/*}/key-vault-enable-msi.sh
done
