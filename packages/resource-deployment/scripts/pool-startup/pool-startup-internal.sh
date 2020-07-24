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

# Commented out deployment will be part of the container image
<<block
echo "Installing chrome"
#referred from https://www.ubuntuupdates.org/ppa/google_chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >/etc/apt/sources.list.d/google.list
apt-get update && apt-get install -y google-chrome-stable

echo "Installing node"
#copied from https://github.com/nodesource/distributions/blob/master/README.md
curl -sL https://deb.nodesource.com/setup_10.x | bash -
apt-get install -y nodejs

echo "Install node_modules on shared location $AZ_BATCH_NODE_SHARED_DIR"
WEB_API_SCAN_JOB_MANAGER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-scan-job-manager
WEB_API_SEND_NOTIFICATION_JOB_MANAGER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-send-notification-job-manager
WEB_API_SCAN_RUNNER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-scan-runner
WEB_API_SEND_NOTIFICATION_RUNNER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-send-notification-runner
SCAN_REQUEST_ON_DEMAND_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-on-demand-scan-request-sender

mkdir -p "$WEB_API_SCAN_JOB_MANAGER_SHARED_LOCATION"
mkdir -p "$WEB_API_SEND_NOTIFICATION_JOB_MANAGER_SHARED_LOCATION"
mkdir -p "$WEB_API_SCAN_RUNNER_SHARED_LOCATION"
mkdir -p "$WEB_API_SEND_NOTIFICATION_RUNNER_SHARED_LOCATION"
mkdir -p "$SCAN_REQUEST_ON_DEMAND_SHARED_LOCATION"

cd "$WEB_API_SCAN_JOB_MANAGER_SHARED_LOCATION"
echo "Installing web api scan job manager dependencies"
npm install yargs@15.3.1 applicationinsights@1.8.0

cd "$WEB_API_SEND_NOTIFICATION_JOB_MANAGER_SHARED_LOCATION"
echo "Installing web api send notification job manager dependencies"
npm install yargs@15.3.1 applicationinsights@1.8.0

cd "$WEB_API_SCAN_RUNNER_SHARED_LOCATION"
echo "Installing web api scan runner dependencies"
npm install yargs@15.3.1 puppeteer@4.0.0 axe-core@3.5.1 axe-puppeteer@1.1.0 applicationinsights@1.8.0

cd "$WEB_API_SEND_NOTIFICATION_RUNNER_SHARED_LOCATION"
echo "Installing web api send notification runner dependencies"
npm install yargs@15.3.1 applicationinsights@1.8.0

cd "$SCAN_REQUEST_ON_DEMAND_SHARED_LOCATION"
echo "Installing on demand scan request sender dependencies"
npm install yargs@15.3.1 applicationinsights@1.8.0
block

echo "Invoking custom pool startup script"
"${0%/*}/custom-pool-post-startup.sh"
echo "Successfully completed pool startup script execution."
