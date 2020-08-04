#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -k <key vault name>
"
    exit 1
}

waitForApplicationUpdates() {
    echo "Waiting for other application updates"
    while fuser /var/{lib/{dpkg,apt/lists},cache/apt/archives}/lock* >/dev/null 2>&1; do
        echo "waiting..."
        sleep 5
    done
}

installBootstrapPackages() {
    # wait for OS updates on reboot
    waitForApplicationUpdates

    echo "Restoring dpkg configuration"
    dpkg --configure -a
    waitForApplicationUpdates

    echo "Running apt-get update"
    apt-get update
    waitForApplicationUpdates

    echo "Installing curl"
    apt-get install -y curl
    waitForApplicationUpdates

    echo "Installing az cli"
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    waitForApplicationUpdates
}

# Read script arguments
while getopts "k:" option; do
    case $option in
    k) KEY_VAULT_NAME=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $KEY_VAULT_NAME ]]; then
    exitWithUsageInfo
fi

installBootstrapPackages

echo "Invoking custom pool startup script"
"${0%/*}/custom-pool-post-startup.sh"

echo "Successfully completed pool startup script execution."
