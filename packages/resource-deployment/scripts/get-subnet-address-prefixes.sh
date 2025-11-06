#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# This script provides centralized subnet address prefix allocation
# for VNet integration and Private Endpoint subnets

# Complete Subnet Allocation (No Overlaps):
# VNet: 10.2.0.0/16

# ├── 10.2.0.0/24     - Default subnet (256 addresses)
# ├── 10.2.1.0/26     - Azure Bastion subnet (64 addresses) - AzureBastionSubnet
# ├── 10.2.1.64/26    - web-api VNet integration (64 addresses)
# ├── 10.2.1.128/26   - web-workers VNet integration (64 addresses)
# ├── 10.2.1.192/26   - e2e-web-apis VNet integration (64 addresses)
# ├── 10.2.2.0/26     - Storage Blob private endpoint (64 addresses)
# ├── 10.2.3.0/26     - Storage Queue private endpoint (64 addresses)
# ├── 10.2.4.0/26     - Storage Table private endpoint (64 addresses)
# ├── 10.2.5.0/26     - Storage File private endpoint (64 addresses)
# ├── 10.2.6.0/26     - Key Vault private endpoint (64 addresses)
# ├── 10.2.7.0/26     - Function App private endpoint (64 addresses)
# └── 10.2.8.0/26     - Cosmos DB private endpoint (64 addresses)

# VNet address space
vnetAddressPrefix="10.2.0.0/16"                     # VNet address space

# Default subnet (created with VNet)
defaultSubnetPrefix="10.2.0.0/24"                   # Default subnet (256 addresses)

# Azure Bastion Subnet (fixed name required by Azure)
azureBastionSubnetPrefix="10.2.1.0/26"              # Azure Bastion subnet (AzureBastionSubnet)

# VNet Integration Subnets (require delegation to Microsoft.Web/serverFarms)
vnetIntegrationSubnetPrefix="10.2.1.64/26"          # Default VNet integration subnet
webApiVnetIntegrationSubnetPrefix="10.2.1.64/26"    # web-api VNet integration
webWorkersVnetIntegrationSubnetPrefix="10.2.1.128/26"  # web-workers VNet integration
e2eWebApisVnetIntegrationSubnetPrefix="10.2.1.192/26" # e2e-web-apis VNet integration

# Private Endpoint Subnets (cannot be delegated)
# Storage Account Private Endpoints
storageBlobSubnetPrefix="10.2.2.0/26"               # Storage Blob private endpoint
storageQueueSubnetPrefix="10.2.3.0/26"              # Storage Queue private endpoint
storageTableSubnetPrefix="10.2.4.0/26"              # Storage Table private endpoint
storageFileSubnetPrefix="10.2.5.0/26"               # Storage File private endpoint

# Other Service Private Endpoints
keyVaultSubnetPrefix="10.2.6.0/26"                  # Key Vault private endpoint
functionAppSubnetPrefix="10.2.7.0/26"               # Function App private endpoint
cosmosDbSubnetPrefix="10.2.8.0/26"                  # Cosmos DB private endpoint

# Helper function to get Azure Bastion subnet prefix
getBastionSubnetPrefix() {
    echo "${azureBastionSubnetPrefix}"
}

# Helper function to get VNet address prefix
getVnetAddressPrefix() {
    echo "${vnetAddressPrefix}"
}

# Helper function to get default subnet prefix
getDefaultSubnetPrefix() {
    echo "${defaultSubnetPrefix}"
}

# Helper function to get subnet prefix for VNet integration
getVnetIntegrationSubnetPrefix() {
    local appPrefix="$1"

    case "${appPrefix}" in
    web-api)
        echo "${webApiVnetIntegrationSubnetPrefix}"
        ;;
    web-workers)
        echo "${webWorkersVnetIntegrationSubnetPrefix}"
        ;;
    e2e-web-apis)
        echo "${e2eWebApisVnetIntegrationSubnetPrefix}"
        ;;
    *)
        echo "${vnetIntegrationSubnetPrefix}"
        ;;
    esac
}

# Helper function to get subnet prefix for Private Endpoint
getPrivateEndpointSubnetPrefix() {
    local groupId="$1"

    case "${groupId}" in
    blob)
        echo "${storageBlobSubnetPrefix}"
        ;;
    queue)
        echo "${storageQueueSubnetPrefix}"
        ;;
    table)
        echo "${storageTableSubnetPrefix}"
        ;;
    file)
        echo "${storageFileSubnetPrefix}"
        ;;
    vault)
        echo "${keyVaultSubnetPrefix}"
        ;;
    sites)
        echo "${functionAppSubnetPrefix}"
        ;;
    sql)
        echo "${cosmosDbSubnetPrefix}"
        ;;
    *)
        echo ""
        ;;
    esac
}
