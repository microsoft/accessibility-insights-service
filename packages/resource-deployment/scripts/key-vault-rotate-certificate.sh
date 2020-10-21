#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

certificateName="azSecPackCert"

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> [-k <key vault>] [-n <key vault certificate name>] [-s <subscription name or id>] [-e <environment: dev, ci, ppe, prod or selftest>]
"
    exit 1
}

loginToAzure() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi
}

getCurrentUserDetails() {
    userType=$(az account show --query "user.type" -o tsv) || true
    principalName=$(az account show --query "user.name" -o tsv) || true

    if [[ $userType == "user" ]]; then
        echo "Running script using current user credentials"
    else
        echo "Running script using service principal identity"
    fi
}

grantUserAccessToKeyVault() {
    if [[ $userType == "user" ]]; then
        echo "Granting access to key vault for current user account"
        az keyvault set-policy --name "$keyVault" --upn "$principalName" --certificate-permissions get list create 1>/dev/null
    else
        echo "Granting access to key vault for service principal account"
        az keyvault set-policy --name "$keyVault" --spn "$principalName" --certificate-permissions get list create 1>/dev/null
    fi
}

revokeUserAccessToKeyVault() {
    if [[ $userType == "user" ]]; then
        echo "Revoking access to key vault for current user account"
        az keyvault delete-policy --name "$keyVault" --upn "$principalName" 1>/dev/null || true
    else
        echo "Revoking access to key vault for service principal account"
        az keyvault delete-policy --name "$keyVault" --spn "$principalName" 1>/dev/null || true
    fi
}

createNewCertificateVersion() {
    echo "Creating new version of certificate..."

    certificatePolicyFile="${0%/*}/../templates/certificate-policy-$environment.json"
    echo "Certificate policy file $certificatePolicyFile"

    thumbprintCurrent=$(az keyvault certificate show --name "$certificateName" --vault-name "$keyVault" --query "x509ThumbprintHex" -o tsv)
    echo "Current certificate thumbprint $thumbprintCurrent"
    az keyvault certificate create --vault-name "$keyVault" --name "$certificateName" --policy "@$certificatePolicyFile"

    thumbprintNew=$(az keyvault certificate show --name "$certificateName" --vault-name "$keyVault" --query "x509ThumbprintHex" -o tsv)
    if [[ $thumbprintCurrent == $thumbprintNew ]]; then
        echo "Error: Certificate thumbprint did not change. Validate az keyvault certificate create command output for details"
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

if [[ ! -z $subscription ]]; then
    az account set --subscription "$subscription"
fi

if [[ -z $keyVault ]]; then
    . "${0%/*}/get-resource-names.sh"
fi

if [[ -z $environment ]]; then
    environment="dev"
fi

getCurrentUserDetails
trap 'revokeUserAccessToKeyVault' EXIT

loginToAzure
grantUserAccessToKeyVault
createNewCertificateVersion
