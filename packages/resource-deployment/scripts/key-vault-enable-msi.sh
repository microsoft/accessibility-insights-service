#!/bin/bash

if [[ -z $keyVault ]] || [[ -z $systemAssignedIdentity ]]; then
    echo \
"
The $0 script expects following variables to be defined:

    keyVault - Azure key vault name
    systemAssignedIdentity - Azure system-assigned managed identity Id
"
    exit 1
fi

# Assign permissions to the VMSS system-assigned managed identity
echo "Assigning '$systemAssignedIdentity' system-assigned managed identity permissions to '$keyVault' key vault"
az keyvault set-policy --name $keyVault --object-id $systemAssignedIdentity --secret-permissions get list 1> /dev/null
