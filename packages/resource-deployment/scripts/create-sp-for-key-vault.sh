#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script will create a service principal and configure its access to Azure resources under resource group and key vault

export subscription
export resourceGroupName
export keyVault

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -s <subscription name or id> -k <key vault>
"
    exit 1
}

# Read script arguments
while getopts "s:r:k:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $subscription ]] || [[ -z $resourceGroupName ]] || [[ -z $keyVault ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Set default subscription scope 
az account set --subscription "$subscription"

# Generate service principal name
user=$(az ad signed-in-user show --query "mailNickname" -o tsv)
spn="https://$user.$resourceGroupName"

# Create or update service principal object
echo "Creating '$spn' service principal..."
password=$(az ad sp create-for-rbac --role contributor --scopes "/subscriptions/$subscription/resourceGroups/$resourceGroupName" --name "$spn" --query "password" -o tsv)

# Set key vault access policy
echo "Granting service principal permissions to the '$keyVault' key vault"
az keyvault set-policy --name "$keyVault" --spn "$spn" --secret-permissions get list 1> /dev/null

# Retrieve service principal object properties
tenant=$(az ad sp show --id "$spn" --query "appOwnerTenantId" -o tsv)
clientId=$(az ad sp show --id "$spn" --query "appId" -o tsv)

# Generate environment variable file template
echo "
Service principal was created successfully.
Copy below output into .env file to enable service principal authentication method:

SP_CLIENT_ID=$clientId
SP_TENANT=$tenant
SP_PASSWORD=$password
"
