#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -r <resource group> -k <key vault> -a <app service> -c <key vault certificate name> [-s <subscription name or id>]
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
    az keyvault certificate create --vault-name "$keyVault" --name "$certificateName" --policy "$(az keyvault certificate get-default-policy)" 1>/dev/null

    thumbprint=$(az keyvault certificate show --name "$certificateName" --vault-name "$keyVault" --query "x509ThumbprintHex" -o tsv)
    echo "Created new version of $certificateName certificate with thumbprint $thumbprint"
}

importCertificateToWebApp() {
    echo "Granting Microsoft.Azure.WebSites service principal access to key vault..."
    az keyvault set-policy --name allyvaultrb7vfzhs7635c --spn Microsoft.Azure.WebSites --certificate-permissions get --secret-permissions get 1>/dev/null

    echo "Importing certificate to $appService web app from $keyVault key vault..."
    az webapp config ssl import --resource-group "$resourceGroup" --name "$appService" --key-vault "$keyVault" --key-vault-certificate-name "$certificateName" 1>/dev/null

    echo "Binding new certificate to web app..."
    az webapp config ssl bind --certificate-thumbprint "$thumbprint" --resource-group "$resourceGroup" --name "$appService" --ssl-type "SNI"
}

# Read script arguments
while getopts ":r:k:a:c:s:" option; do
    case $option in
    r) resourceGroup=${OPTARG} ;;
    k) keyVault=${OPTARG} ;;
    a) appService=${OPTARG} ;;
    c) certificateName=${OPTARG} ;;
    s) subscription=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $resourceGroup ]] || [[ -z $keyVault ]] || [[ -z $certificateName ]] || [[ -z $appService ]]; then
    exitWithUsageInfo
fi

if [[ ! -z $subscription ]]; then
    az account set --subscription "$subscription"
fi

getCurrentUserDetails
trap 'revokeUserAccessToKeyVault' EXIT

loginToAzure
grantUserAccessToKeyVault
createNewCertificateVersion
importCertificateToWebApp

echo "Certificate rotation successfully completed"
