#!/bin/bash

# The script will configure the default Azure subscription account to support Batch user subscription mode

if [[ -z $resourceGroup ]] || [[ -z $keyVault ]]; then
    echo \
"
The $0 script expects following variables to be defined:

    resourceGroup - Azure resource group name
    keyVault - Azure key vault name
"
    exit 1
fi

# Get the default subscription
subscription=$(az account show --query "id" -o tsv)

echo "Validating Microsoft.Batch provider registration on '$subscription' Azure subscription"
batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)

# Register Microsoft.Batch provider on Azure subscription
if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "Registering Microsoft.Batch provider on '$subscription' Azure subscription"
    az provider register --namespace Microsoft.Batch

    # Wait for the registration to complete
    end=$(($SECONDS+300))
    printf " - Running .."
    while [ $SECONDS -le $end ]; do
        sleep 10
        printf "."
        batchProviderRegistrationState=$(az provider show --namespace Microsoft.Batch --query "registrationState" -o tsv)
        if [[ $batchProviderRegistrationState == "Registered" ]]; then
            break
        fi
    done
    echo ""
fi

if [[ $batchProviderRegistrationState != "Registered" ]]; then
    echo "ERROR: Unable to register Microsoft.Batch provider on '$subscription' Azure subscription. Check Azure subscription resource providers state."
fi

# Allow Azure Batch service to access the subscription
#   Microsoft Azure Batch application: ddbf3205-c6bd-46ae-8127-60eb93363864
#   MicrosoftAzureBatch application: 1f84fc1f-927a-4d75-b1ba-6aa7707dd5b5

echo "Granting Azure Batch API access to the '$subscription' Azure subscription"
az role assignment create --assignee 1f84fc1f-927a-4d75-b1ba-6aa7707dd5b5 --role contributor 1> /dev/null
az role assignment create --assignee ddbf3205-c6bd-46ae-8127-60eb93363864 --role contributor 1> /dev/null

# Add an access policy to the key vault to allow access by the Batch service
echo "Granting Azure Batch API access to the '$keyVault' key vault"
az keyvault set-policy --resource-group $resourceGroup --name $keyVault \
    --spn ddbf3205-c6bd-46ae-8127-60eb93363864 \
    --secret-permissions delete get list set 1> /dev/null
