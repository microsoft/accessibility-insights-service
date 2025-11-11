#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

# The script will enable public network access for all supported Azure services

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -r <resource group> [-s <services (optional)>]

Required parameters:
  -r  Resource group name

Optional parameters:
  -s  Comma-separated list of services to enable public network access for
      Available services: blob, queue, table, file, vault, sql
      Default: All services (blob,queue,table,file,vault,sql)

Examples:
  # Enable public network access for all supported services
  ${BASH_SOURCE} -r myRG

  # Enable public network access only for storage services
  ${BASH_SOURCE} -r myRG -s blob,queue,table,file

  # Enable public network access only for vault and sql
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

echo "[enable-all-public-network-access] Starting public network access enablement for all services"
echo "  Resource Group: ${resourceGroupName}"
echo "  Services: ${services}"
echo ""

# Track success and failures
successCount=0
failureCount=0
declare -a failedServices

# Enable public network access for each service
for service in "${serviceArray[@]}"; do
    # Trim whitespace
    service=$(echo "${service}" | xargs)

    echo "========================================================================"
    echo "Enabling public network access for service: ${service}"
    echo "========================================================================"

    if "${scriptDir}/enable-public-network-access.sh" -r "${resourceGroupName}" -g "${service}"; then
        echo ""
        echo "✓ Successfully enabled public network access for: ${service}"
        successCount=$((successCount + 1))
    else
        echo ""
        echo "✗ Failed to enable public network access for: ${service}"
        failureCount=$((failureCount + 1))
        failedServices+=("${service}")
    fi

    echo ""
done

echo "========================================================================"
echo "[enable-all-public-network-access] Summary"
echo "========================================================================"
echo "  Total services processed: ${#serviceArray[@]}"
echo "  Successful: ${successCount}"
echo "  Failed: ${failureCount}"

if [[ ${failureCount} -gt 0 ]]; then
    echo ""
    echo "  Failed services:"
    for failedService in "${failedServices[@]}"; do
        echo "    - ${failedService}"
    done
    echo ""
    echo "[enable-all-public-network-access] Completed with errors"
    exit 1
else
    echo ""
    echo "[enable-all-public-network-access] All services public network access enabled successfully"
fi
