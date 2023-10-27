#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

certificateName="azSecPackCert"

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-k <key vault>] [-n <key vault certificate name>] [-s <subscription name or id>] [-e <environment: dev, ci, ppe, prod or selftest>]
"
    exit 1
}

getCurrentUserDetails() {
    echo "Getting logged in user name"
    principalName=$(az account show --query "user.name" -o tsv)

    if [[ -z $principalName ]]; then
        echo "Unable to get logged in user name"
        exit 1
    fi
}

grantUserAccessToKeyVault() {
    echo "Adding key vault role assignment for logged in user"
    az role assignment create \
        --role "Key Vault Certificates Officer" \
        --assignee "$principalName" \
        --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName/providers/Microsoft.KeyVault/vaults/$keyVault" 1>/dev/null
}

onExit-key-vault-rotate-certificate() {
    echo "Revoking key vault role assignment for logged in user"
    az role assignment delete \
        --role "Key Vault Certificates Officer" \
        --assignee "$principalName" \
        --scope "/subscriptions/$subscription/resourcegroups/$resourceGroupName/providers/Microsoft.KeyVault/vaults/$keyVault" >/dev/null 2>&1
}

createNewCertificateVersion() {
    echo "Creating new version of certificate..."
    thumbprintCurrent=$(az keyvault certificate show --name "$certificateName" --vault-name "$keyVault" --query "x509ThumbprintHex" -o tsv)
    certificatePolicyFile="${0%/*}/../templates/certificate-policy-$environment.json"
    az keyvault certificate create --vault-name "$keyVault" --name "$certificateName" --policy "@$certificatePolicyFile"
    thumbprintNew=$(az keyvault certificate show --name "$certificateName" --vault-name "$keyVault" --query "x509ThumbprintHex" -o tsv)
    if [[ $thumbprintCurrent == $thumbprintNew ]]; then
        echo "Error: Failure to create the certificate. Validate command output for details."
        exit 1
    else
        echo "Created new version of $certificateName certificate with thumbprint $thumbprintNew"
    fi
}

# Read script arguments
while getopts ":s:r:k:n:e:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroupName ]] || [[ -z $certificateName ]]; then
    exitWithUsageInfo
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

getCurrentUserDetails
trap 'onExit-key-vault-rotate-certificate' EXIT

grantUserAccessToKeyVault
createNewCertificateVersion
