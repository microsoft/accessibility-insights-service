#!/bin/bash

# This script will grant permissions to the managed identity to access key vault

if [[ -z $keyVault ]] || [[ -z $systemAssignedIdentity ]]; then
    echo \
"
The $0 script expects following variables to be defined:

    keyVault - Azure key vault name
    systemAssignedIdentity - Azure system-assigned managed identity Id
"
    exit 1
fi

# Grant permissions to the managed identity
echo "Granting '$systemAssignedIdentity' managed identity permissions to '$keyVault' key vault"
az keyvault set-policy --name $keyVault --object-id $systemAssignedIdentity --secret-permissions get list 1> /dev/null
