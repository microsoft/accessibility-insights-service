#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -e <environment> [-a <app registration client id>] [-n <certificate name>]

Options:
    -r  Resource group name (required)
    -e  Environment name (required, must be ppe)
    -a  App registration client ID (optional, must be pre-created manually)
    -n  Certificate name (default: secScanCert)

This script performs end-to-end setup of certificate authentication for the function app:
    1. Creates the security scan Key Vault
    2. Creates/rotates a certificate in the Key Vault
    3. Verifies the app registration for certificate authentication
    4. Enables certificate authentication on the function app
"
    exit 1
}

# Read script arguments
while getopts ":r:e:n:a:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    a) appRegistrationClientId=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${environment} ]]; then
    exitWithUsageInfo
fi

export resourceGroupName
export environment
export certificateName
export appRegistrationClientId
export keyVaultType="secscan"
export objectId="bda937a5-4fd5-4ca0-9710-c1729a120c07" # Object ID for "Security Scan Key Vault Access" in tenant

if [[ ${environment} != ppe* ]]; then
    echo "Skipping certificate authentication setup for non-ppe environment: ${environment}"
    exit 0
fi

if [[ -z ${certificateName} ]]; then
    certificateName="secScanCert"
fi

. "${0%/*}/get-resource-names.sh"

enableKeyVaultPublicAccess() {
    echo "Enabling public network access for key vault ${keyVaultSecScan}"
    az keyvault update \
        --name "${keyVaultSecScan}" \
        --resource-group "${resourceGroupName}" \
        --public-network-access Enabled 1>/dev/null
}

disableKeyVaultPublicAccess() {
    echo "Disabling public network access for key vault ${keyVaultSecScan}"
    az keyvault update \
        --name "${keyVaultSecScan}" \
        --resource-group "${resourceGroupName}" \
        --public-network-access Disabled 1>/dev/null
}

echo "Step 1/3: Creating security scan Key Vault"
"${0%/*}/create-key-vault.sh"

enableKeyVaultPublicAccess
trap 'disableKeyVaultPublicAccess' EXIT

echo "Step 2/3: Creating certificate in Key Vault"
"${0%/*}/key-vault-rotate-certificate.sh"

echo "Step 3/3: Enabling certificate authentication on function app"
"${0%/*}/enable-function-app-cert-auth.sh" -r "${resourceGroupName}" -a "${appRegistrationClientId}"

echo "Certificate authentication setup completed successfully"
