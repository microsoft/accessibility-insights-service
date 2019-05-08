#!/bin/bash

# Assign permissions to the VMSS system-assigned managed identity
echo "Assigning '$systemAssignedIdentity' system-assigned managed identity permissions to '$keyVault' key vault"
keyVaultProperties=$(az keyvault set-policy --name $keyVault --object-id $systemAssignedIdentity --secret-permissions get list)
