#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -e <environment> [-n <certificate name>]

Options:
    -r  Resource group name (required)
    -e  Environment name (required, must be ppe)
    -n  Certificate name (default: secScanCert)

This script performs end-to-end setup of certificate authentication for the function app:
    1. Creates the security scan Key Vault
    2. Creates/rotates a certificate in the Key Vault
    3. Enables certificate authentication on the function app
"
    exit 1
}

# Read script arguments
while getopts ":r:e:n:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    e) environment=${OPTARG} ;;
    n) certificateName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${environment} ]]; then
    exitWithUsageInfo
fi

export resourceGroupName
export environment
export certificateName
export keyVaultType="secscan"
export objectId="bda937a5-4fd5-4ca0-9710-c1729a120c07" # Object ID for "Security Scan Key Vault Access" in tenant

if [[ ${environment} != ppe* ]]; then
    echo "Skipping certificate authentication setup for non-ppe environment: ${environment}"
    exit 0
fi

echo "Step 1/3: Creating security scan Key Vault"
"${0%/*}/create-key-vault.sh"

echo "Step 2/3: Creating certificate in Key Vault"
"${0%/*}/key-vault-rotate-certificate.sh"

echo "Step 3/3: Enabling certificate authentication on function app"
"${0%/*}/enable-function-app-cert-auth.sh"

echo "Certificate authentication setup completed successfully"
