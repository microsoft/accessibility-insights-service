#!/bin/bash
set -o errexit

# Read script parameters
while getopts "s:r:a:p:k:" option; do
case $option in
    s) subscription=${OPTARG};;
    r) resourceGroup=${OPTARG};;
    a) account=${OPTARG};;
    p) pool=${OPTARG};;
    k) keyVault=${OPTARG};;
esac
done

if [[ -z $subscription ]] || [[ -z $resourceGroup ]]  || [[ -z $account ]] || [[ -z $pool ]] || [[ -z $keyVault ]]; then
    echo "
Usage: $0 -s <subscription> -r <resource group> -a <batch account> -p <batch pool> -k <key vault>

Prerequisites:
    Azure Batch Account with user subscription pool allocation mode
    Azure Batch pool with at least one VM available
    Azure Key vault
"
	exit 0
fi

export vmssResourceGroup
export vmssName
export systemAssignedIdentity

source batch-pool-enable-msi.sh
source key-vault-enable-msi.sh

echo "
System-assigned managed identity is enabled.
    System-assigned identity: $systemAssignedIdentity
    Batch account: $account
    Batch pool: $pool
    VMSS resource group: $vmssResourceGroup
    VMSS name: $vmssName
    Key vault: $keyVault
"
