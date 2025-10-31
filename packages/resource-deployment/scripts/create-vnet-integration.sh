#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

# The script will create VNet integration for Azure Function Apps
# https://learn.microsoft.com/en-us/azure/azure-functions/functions-networking-options

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> -n <function app name prefix> [-s <function app resource id (optional)>] [-p <subnet address prefix (optional)>] [-u <subnet name (optional)>]

Required parameters:
  -r  Resource group name
  -n  Function App name prefix (e.g., 'web-api', 'web-workers', 'e2e-web-apis')

Optional parameters:
  -s  Function App resource ID (auto-detected based on prefix if not provided)
       - If not specified, the script will automatically determine the resource ID
         using predefined resource names from the resource group
  -p  Subnet address prefix (auto-assigned based on prefix if not provided)
  -u  Subnet name (default: <prefix>-vnet-integration-subnet)

Examples:
  # For web-api Function App (auto-detects function app from resource group)
  ${BASH_SOURCE} -r myRG -n web-api

  # For web-workers Function App with custom subnet
  ${BASH_SOURCE} -r myRG -n web-workers -p 10.2.9.0/26

  # For e2e-web-apis Function App
  ${BASH_SOURCE} -r myRG -n e2e-web-apis

  # With explicit resource ID
  ${BASH_SOURCE} -r myRG -s /subscriptions/.../sites/myfuncapp -u custom-subnet
"
    exit 1
}

getFunctionAppResourceId() {
    if [[ -n "${functionAppResourceId}" ]]; then
        echo "Using provided Function App resource ID: ${functionAppResourceId}"
        return
    fi

    echo "Auto-detecting Function App resource ID based on prefix '${functionAppNamePrefix}'..."

    # Get resource names from get-resource-names.sh (already sourced)
    local funcAppName
    if [[ "${functionAppNamePrefix}" == "web-workers" ]]; then
        funcAppName="${webWorkersFuncAppName}"
    elif [[ "${functionAppNamePrefix}" == "web-api" ]]; then
        funcAppName="${webApiFuncAppName}"
    elif [[ "${functionAppNamePrefix}" == "e2e-web-apis" ]]; then
        funcAppName="${e2eWebApisFuncAppName}"
    else
        echo "Error: Function App name not found in resource group ${resourceGroupName}"
        exit 1
    fi

    functionAppResourceId="/subscriptions/${subscription}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${funcAppName}"
    functionAppName="${funcAppName}"
    echo "  Detected Function App: ${funcAppName}"
    echo "Auto-detected Function App resource ID: ${functionAppResourceId}"
}

createVnetIntegrationSubnet() {
    echo "Checking if VNet integration subnet exists..."
    local existingSubnet
    existingSubnet=$(az network vnet subnet show \
        --name "${subnetName}" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --query "name" \
        -o tsv 2>/dev/null || true)

    if [[ -z "${existingSubnet}" ]]; then
        echo "Creating VNet integration subnet in VNet ${vnetName}..."

        # VNet integration requires subnet delegation to Microsoft.Web/serverFarms
        az network vnet subnet create \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" \
            --address-prefixes "${subnetAddressPrefix}" \
            --delegations Microsoft.Web/serverFarms 1>/dev/null
        echo "VNet integration subnet created successfully"
    else
        echo "VNet integration subnet already exists: ${subnetName}"

        # Verify subnet delegation
        local delegation
        delegation=$(az network vnet subnet show \
            --name "${subnetName}" \
            --resource-group "${resourceGroupName}" \
            --vnet-name "${vnetName}" \
            --query "delegations[?serviceName=='Microsoft.Web/serverFarms'].serviceName | [0]" \
            -o tsv 2>/dev/null || true)

        if [[ -z "${delegation}" ]]; then
            echo "  Warning: Subnet exists but is not delegated to Microsoft.Web/serverFarms"
            echo "  Adding delegation for VNet integration..."
            az network vnet subnet update \
                --name "${subnetName}" \
                --resource-group "${resourceGroupName}" \
                --vnet-name "${vnetName}" \
                --delegations Microsoft.Web/serverFarms 1>/dev/null
            echo "  Subnet delegation added successfully"
        else
            echo "  Subnet delegation to Microsoft.Web/serverFarms already exists"
        fi
    fi
}

connectVnetIntegration() {
    echo "Connecting Function App to VNet integration subnet..."

    # Get subnet ID
    local subnetId
    subnetId=$(az network vnet subnet show \
        --name "${subnetName}" \
        --resource-group "${resourceGroupName}" \
        --vnet-name "${vnetName}" \
        --query "id" \
        -o tsv)

    # Check if VNet integration already exists
    local existingSubnetId
    existingSubnetId=$(az functionapp vnet-integration list \
        --name "${functionAppName}" \
        --resource-group "${resourceGroupName}" \
        --query "[0].vnetResourceId" \
        -o tsv 2>/dev/null || true)

    if [[ -n "${existingSubnetId}" ]]; then
        if [[ "${existingSubnetId}" == "${subnetId}" ]]; then
            echo "Function App is already integrated with subnet: ${subnetName}"
            return
        else
            echo "  Warning: Function App is integrated with a different subnet"
            echo "  Removing existing VNet integration..."
            az functionapp vnet-integration remove \
                --name "${functionAppName}" \
                --resource-group "${resourceGroupName}" 1>/dev/null
            echo "  Existing VNet integration removed"
        fi
    fi

    echo "Adding VNet integration to Function App: ${functionAppName}..."
    az functionapp vnet-integration add \
        --name "${functionAppName}" \
        --resource-group "${resourceGroupName}" \
        --vnet "${vnetName}" \
        --subnet "${subnetName}" 1>/dev/null

    echo "VNet integration added successfully"
}

enableRouteAll() {
    echo "Enabling route-all setting for outbound traffic..."

    # Route all outbound traffic through the VNet
    az functionapp config appsettings set \
        --name "${functionAppName}" \
        --resource-group "${resourceGroupName}" \
        --settings WEBSITE_VNET_ROUTE_ALL=1 1>/dev/null

    echo "Route-all setting enabled successfully"
}

# Read script arguments
while getopts ":r:n:s:p:u:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    n) functionAppNamePrefix=${OPTARG} ;;
    s) functionAppResourceId=${OPTARG} ;;
    p) subnetAddressPrefix=${OPTARG} ;;
    u) subnetName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]] || [[ -z ${functionAppNamePrefix} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

# Get resource names and location
. "${0%/*}/get-resource-names.sh"
. "${0%/*}/get-subnet-address-prefixes.sh"
location=$(az group show --name "${resourceGroupName}" --query "location" -o tsv)

# Auto-detect Function App resource ID if not provided
getFunctionAppResourceId

# Set default values if not provided
defaultSubnetPrefix=$(getVnetIntegrationSubnetPrefix "${functionAppNamePrefix}")
subnetAddressPrefix=${subnetAddressPrefix:-${defaultSubnetPrefix}}
subnetName=${subnetName:-"${functionAppNamePrefix}-vnet-integration-subnet"}

echo "[create-vnet-integration] Starting VNet integration setup"
echo "  Resource Group: ${resourceGroupName}"
echo "  Function App: ${functionAppName}"
echo "  Function App Resource ID: ${functionAppResourceId}"
echo "  VNet: ${vnetName}"
echo "  Subnet Name: ${subnetName}"
echo "  Subnet Address Prefix: ${subnetAddressPrefix}"
echo "  Location: ${location}"
echo ""

createVnetIntegrationSubnet
connectVnetIntegration
enableRouteAll

echo ""
echo "[create-vnet-integration] VNet integration setup completed successfully"
echo "  Function App: ${functionAppName}"
echo "  VNet: ${vnetName}"
echo "  Subnet: ${subnetName}"
echo "  Route All: Enabled"
