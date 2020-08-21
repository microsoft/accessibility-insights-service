#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -k <key vault name>
"
    exit 1
}

loginToAzure() {
    if [[ $userType == "user" ]]; then
        if ! az account show 1>/dev/null; then
            az login
        fi
    else
        az login --identity 1>/dev/null
    fi
}

getCurrentUserDetails() {
    userType=$(az account show --query "user.type" -o tsv) || true
    principalName=$(az account show --query "user.name" -o tsv) || true

    if [[ $userType == "user" ]]; then
        echo "Running script using current user credentials"
    else
        echo "Running script using system managed identity"
    fi
}

grantUserAccessToKeyVault() {
    if [[ $userType == "user" ]]; then
        echo "Granting access to key vault for current user account"
        az keyvault set-policy --name "$keyVault" --upn "$principalName" --secret-permissions get list 1>/dev/null
    fi
}

revokeUserAccessToKeyVault() {
    if [[ $userType == "user" ]]; then
        echo "Revoking access to key vault for current user account"
        az keyvault delete-policy --name "$keyVault" --upn "$principalName" 1>/dev/null || true
    fi
}

getSecretValue() {
    local key=$1

    local secretValue=$(az keyvault secret show --name "$key" --vault-name "$keyVault" --query "value" -o tsv)

    if [[ -z $secretValue ]]; then
        echo "Unable to get secret for the $key"
        exit 1
    fi

    eval $2=$secretValue
}

loginToContainerRegistry() {
    local containerRegistryUsername
    local containerRegistryPassword

    getSecretValue "containerRegistryUsername" containerRegistryUsername
    getSecretValue "containerRegistryPassword" containerRegistryPassword
    containerRegistryName=$containerRegistryUsername

    azurecr="$containerRegistryUsername.azurecr.io"
    echo "Login to the container registry $azurecr..."
    docker login -u "$containerRegistryUsername" --password-stdin "$azurecr" <<<"$containerRegistryPassword"
}

pullDockerImages() {
    echo "Pulling Batch images from container registry..."
    images=$(az acr repository list --name $containerRegistryName --query "[?starts_with(@, 'batch-')]" -o tsv)
    for image in $images; do
        fullImageName="$azurecr/$image:latest"
        echo "Pulling image $fullImageName"
        docker pull $fullImageName
    done
}

# Read script arguments
while getopts "k:" option; do
    case $option in
    k) KEY_VAULT_NAME=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $KEY_VAULT_NAME ]]; then
    exitWithUsageInfo
fi

# The KEY_VAULT_NAME is preset environment variable
keyVault=$KEY_VAULT_NAME

getCurrentUserDetails
trap 'revokeUserAccessToKeyVault' EXIT

loginToAzure
grantUserAccessToKeyVault
loginToContainerRegistry
pullDockerImages
