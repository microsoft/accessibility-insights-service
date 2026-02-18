#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-n <certificate name>]
"
    exit 1
}

# Read script arguments
while getopts ":r:n:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${certificateName} ]]; then
    certificateName="secScanCert"
fi

. "${0%/*}/get-resource-names.sh"

echo "Enabling certificate authentication for ${webApiFuncAppName} function app..."

# Get the certificate thumbprint from Key Vault
thumbprint=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVaultSecScan}" --query "x509ThumbprintHex" -o tsv)

if [[ -z ${thumbprint} ]]; then
    echo "Unable to get certificate thumbprint for certificate ${certificateName} from key vault ${keyVaultSecScan}"
    exit 1
fi

echo "Using certificate ${certificateName} with thumbprint ${thumbprint}"

# Upload the Key Vault certificate to the function app
certificateId=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVaultSecScan}" --query "id" -o tsv)

az webapp config ssl import \
    --resource-group "${resourceGroupName}" \
    --name "${webApiFuncAppName}" \
    --key-vault "${keyVaultSecScan}" \
    --key-vault-certificate-name "${certificateName}" 1>/dev/null

echo "Imported certificate ${certificateName} to ${webApiFuncAppName}"

# Enable client certificate authentication on the function app
az functionapp update \
    --resource-group "${resourceGroupName}" \
    --name "${webApiFuncAppName}" \
    --set clientCertEnabled=true \
    --set clientCertMode=Required 1>/dev/null

echo "Enabled client certificate authentication on ${webApiFuncAppName}"

# Set the certificate thumbprint for client certificate exclusion path filtering (optional)
# This allows health check endpoints to be accessed without a client certificate
az functionapp config appsettings set \
    --resource-group "${resourceGroupName}" \
    --name "${webApiFuncAppName}" \
    --settings "WEBSITE_CLIENT_CERT_THUMBPRINT=${thumbprint}" 1>/dev/null

echo "Successfully enabled certificate authentication for ${webApiFuncAppName} function app with certificate ${certificateName}"
