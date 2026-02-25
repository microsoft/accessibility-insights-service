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

getCurrentUserDetails() {
    echo "Getting logged in user name"
    principalName=$(az account show --query "user.name" -o tsv)

    if [[ -z ${principalName} ]]; then
        echo "Unable to get logged in user name"
        exit 1
    fi
}

grantUserAccessToKeyVault() {
    echo "Adding key vault role assignment for logged in user"
    az role assignment create \
        --role "Key Vault Secrets User" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultSecScan}" 1>/dev/null
}

grantAppServiceAccessToKeyVault() {
    local kvScope="/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultSecScan}"

    # Use the function app's system-assigned managed identity
    local functionAppPrincipalId
    functionAppPrincipalId=$(az functionapp identity show \
        --name "${webApiFuncAppName}" \
        --resource-group "${resourceGroupName}" \
        --query "principalId" -o tsv)

    if [[ -z "${functionAppPrincipalId}" ]]; then
        echo "Enabling system-assigned managed identity for ${webApiFuncAppName}..."
        functionAppPrincipalId=$(az functionapp identity assign \
            --name "${webApiFuncAppName}" \
            --resource-group "${resourceGroupName}" \
            --query "principalId" -o tsv)
    fi

    echo "Granting function app managed identity access to key vault ${keyVaultSecScan}"
    az role assignment create \
        --role "Key Vault Secrets User" \
        --assignee-object-id "${functionAppPrincipalId}" \
        --assignee-principal-type ServicePrincipal \
        --scope "${kvScope}" 1>/dev/null
}

onExit-enable-function-app-cert-auth() {
    echo "Revoking key vault role assignment for logged in user"
    az role assignment delete \
        --role "Key Vault Secrets User" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultSecScan}" >/dev/null 2>&1
}

getCurrentUserDetails
trap 'onExit-enable-function-app-cert-auth' EXIT
grantUserAccessToKeyVault
grantAppServiceAccessToKeyVault

echo "Enabling certificate authentication for ${webApiFuncAppName} function app..."

# Get the certificate thumbprint from Key Vault
thumbprint=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVaultSecScan}" --query "x509ThumbprintHex" -o tsv)

if [[ -z ${thumbprint} ]]; then
    echo "Unable to get certificate thumbprint for certificate ${certificateName} from key vault ${keyVaultSecScan}"
    exit 1
fi

echo "Using certificate ${certificateName} with thumbprint ${thumbprint}"

# Download the certificate from Key Vault and upload it to the function app directly.
# This avoids the need for the Microsoft.Azure.WebSites resource provider service principal
# to have access to Key Vault (which may not be available in all tenants).
certFile=$(mktemp /tmp/cert-XXXXXX.pfx)
rm -f "${certFile}"
trap 'rm -f "${certFile}"; onExit-enable-function-app-cert-auth' EXIT

az keyvault secret download \
    --name "${certificateName}" \
    --vault-name "${keyVaultSecScan}" \
    --encoding base64 \
    --file "${certFile}" 1>/dev/null

az webapp config ssl upload \
    --resource-group "${resourceGroupName}" \
    --name "${webApiFuncAppName}" \
    --certificate-file "${certFile}" \
    --certificate-password "" 1>/dev/null

rm -f "${certFile}"

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
