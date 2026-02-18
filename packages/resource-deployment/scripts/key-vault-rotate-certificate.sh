#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

certificateName="secScanCert"
certificatePolicyPrefix="certificate-policy-sec-scan"

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <subscription name or id>] [-k <key vault>] [-n <certificate name>] [-e <environment>] [-p <certificate policy prefix>]

Options:
    -r  Resource group name (required)
    -s  Azure subscription name or ID
    -k  Key vault name
    -n  Key vault certificate name (default: ${certificateName})
    -e  Environment name (default: dev). Combined with policy prefix to select template
    -p  Certificate policy file name prefix (default: ${certificatePolicyPrefix}). Resolves to <prefix>-<environment>.json
"
    exit 1
}

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
        --role "Key Vault Certificates Officer" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultSecScan}" 1>/dev/null
}

onExit-key-vault-rotate-certificate() {
    echo "Revoking key vault role assignment for logged in user"
    az role assignment delete \
        --role "Key Vault Certificates Officer" \
        --assignee "${principalName}" \
        --scope "/subscriptions/${subscription}/resourcegroups/${resourceGroupName}/providers/Microsoft.KeyVault/vaults/${keyVaultSecScan}" >/dev/null 2>&1
}

createNewCertificateVersion() {
    echo "Creating new version of certificate..."
    thumbprintCurrent=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVaultSecScan}" --query "x509ThumbprintHex" -o tsv 2>/dev/null) || thumbprintCurrent=""

    az keyvault certificate create --vault-name "${keyVaultSecScan}" --name "${certificateName}" --policy "@${certificatePolicyFile}" 2>/dev/null || true

    # Check certificate operation status for errors
    local operationStatus
    operationStatus=$(az keyvault certificate pending show --vault-name "${keyVaultSecScan}" --name "${certificateName}" --query "statusDetails" -o tsv 2>/dev/null) || operationStatus=""
    if [[ -n "${operationStatus}" ]]; then
        echo "Certificate operation status: ${operationStatus}"
    fi

    thumbprintNew=$(az keyvault certificate show --name "${certificateName}" --vault-name "${keyVaultSecScan}" --query "x509ThumbprintHex" -o tsv 2>/dev/null) || thumbprintNew=""
    if [[ -z "${thumbprintNew}" ]]; then
        echo "Error: Failure to create the certificate. Operation status: ${operationStatus}"
        exit 1
    elif [[ -n "${thumbprintCurrent}" ]] && [[ "${thumbprintCurrent}" == "${thumbprintNew}" ]]; then
        echo "Error: Certificate thumbprint did not change after creation. Operation status: ${operationStatus}"
        exit 1
    else
        echo "Created new version of ${certificateName} certificate with thumbprint ${thumbprintNew}"
    fi
}

# Read script arguments
while getopts ":s:r:k:n:e:p:" option; do
    case ${option} in
    s) subscription=${OPTARG} ;;
    r) resourceGroupName=${OPTARG} ;;
    k) keyVaultSecScan=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    p) certificatePolicyPrefix=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${environment} ]]; then
    environment="prod"
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

. "${0%/*}/get-resource-names.sh"

getCurrentUserDetails
trap 'onExit-key-vault-rotate-certificate' EXIT

function ensureCertificateIssuer() {
    certificatePolicyFile="${0%/*}/../templates/${certificatePolicyPrefix}-${environment}.json"
    local issuerName
    issuerName=$(jq -r '.issuerParameters.name' "${certificatePolicyFile}")

    if [[ "${issuerName}" == "Self" || "${issuerName}" == "Unknown" ]]; then
        return
    fi

    local existingIssuer
    existingIssuer=$(az keyvault certificate issuer show --vault-name "${keyVaultSecScan}" --issuer-name "${issuerName}" --query "provider" -o tsv 2>/dev/null) || existingIssuer=""

    if [[ -z "${existingIssuer}" ]]; then
        echo "Registering certificate issuer ${issuerName} in ${keyVaultSecScan}"
        az keyvault certificate issuer create \
            --vault-name "${keyVaultSecScan}" \
            --issuer-name "${issuerName}" \
            --provider-name "${issuerName}" 1>/dev/null
    else
        echo "Certificate issuer ${issuerName} already exists in ${keyVaultSecScan}."
    fi
}

grantUserAccessToKeyVault
ensureCertificateIssuer
createNewCertificateVersion
