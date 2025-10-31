#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# The script will create Azure Private Endpoints for all supported services

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <services (optional)>]

Required parameters:
  -r  Resource group name

Optional parameters:
  -s  Comma-separated list of services to create private endpoints for
      Available services: blob, queue, table, file, vault, sql
      Default: All services (blob,queue,table,file,vault,sql)

Examples:
  # Create private endpoints for all supported services
  ${BASH_SOURCE} -r myRG

  # Create private endpoints only for storage services
  ${BASH_SOURCE} -r myRG -s blob,queue,table,file

  # Create private endpoints only for vault and sql
  ${BASH_SOURCE} -r myRG -s vault,sql
"
    exit 1
}

# Read script arguments
services="blob,queue,table,file,vault,sql"
while getopts ":r:s:" option; do
    case ${option} in
    r) resourceGroupName=${OPTARG} ;;
    s) services=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${resourceGroupName} ]]; then
    exitWithUsageInfo
fi

# Login to Azure if required
if ! az account show 1>/dev/null; then
    az login
fi

scriptDir="${0%/*}"

# Convert comma-separated services to array
IFS=',' read -ra serviceArray <<< "${services}"

echo "[create-all-private-links] Starting Private Endpoint creation for all services"
echo "  Resource Group: ${resourceGroupName}"
echo "  Services: ${services}"
echo ""

# Track success and failures
successCount=0
failureCount=0
declare -a failedServices

# Create private endpoints for each service
for service in "${serviceArray[@]}"; do
    # Trim whitespace
    service=$(echo "${service}" | xargs)

    echo "========================================================================"
    echo "Creating Private Endpoint for service: ${service}"
    echo "========================================================================"

    if "${scriptDir}/create-private-link.sh" -r "${resourceGroupName}" -g "${service}"; then
        echo ""
        echo "✓ Successfully created Private Endpoint for: ${service}"
        successCount=$((successCount + 1))
    else
        echo ""
        echo "✗ Failed to create Private Endpoint for: ${service}"
        failureCount=$((failureCount + 1))
        failedServices+=("${service}")
    fi

    echo ""
done

# Create VNet integration for Function Apps
echo "========================================================================"
echo "Creating VNet Integration for Function Apps"
echo "========================================================================"

vnetIntegrationApps=("web-api" "web-workers")
vnetSuccessCount=0
vnetFailureCount=0
declare -a failedVnetApps

for app in "${vnetIntegrationApps[@]}"; do
    echo "========================================================================"
    echo "Creating VNet Integration for Function App: ${app}"
    echo "========================================================================"

    if "${scriptDir}/create-vnet-integration.sh" -r "${resourceGroupName}" -n "${app}"; then
        echo ""
        echo "✓ Successfully created VNet Integration for: ${app}"
        vnetSuccessCount=$((vnetSuccessCount + 1))
    else
        echo ""
        echo "✗ Failed to create VNet Integration for: ${app}"
        vnetFailureCount=$((vnetFailureCount + 1))
        failedVnetApps+=("${app}")
    fi

    echo ""
done

echo "========================================================================"
echo "[create-all-private-links] Summary"
echo "========================================================================"
echo "  Total services processed: ${#serviceArray[@]}"
echo "  Successful: ${successCount}"
echo "  Failed: ${failureCount}"
echo ""
echo "  Total VNet integrations processed: ${#vnetIntegrationApps[@]}"
echo "  Successful: ${vnetSuccessCount}"
echo "  Failed: ${vnetFailureCount}"

if [[ ${failureCount} -gt 0 ]] || [[ ${vnetFailureCount} -gt 0 ]]; then
    echo ""
    if [[ ${failureCount} -gt 0 ]]; then
        echo "  Failed services:"
        for failedService in "${failedServices[@]}"; do
            echo "    - ${failedService}"
        done
    fi
    if [[ ${vnetFailureCount} -gt 0 ]]; then
        echo "  Failed VNet integrations:"
        for failedApp in "${failedVnetApps[@]}"; do
            echo "    - ${failedApp}"
        done
    fi
    echo ""
    echo "[create-all-private-links] Completed with errors"
    exit 1
else
    echo ""
    echo "[create-all-private-links] All Private Endpoints and VNet Integrations created successfully"
    exit 0
fi
