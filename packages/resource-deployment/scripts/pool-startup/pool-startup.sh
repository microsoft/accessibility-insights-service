#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

set -eo pipefail

waitForAptUpdates() {
    echo "waiting for other apt updates"
    while fuser /var/{lib/{dpkg,apt/lists},cache/apt/archives}/lock* >/dev/null 2>&1; do
        echo "waiting ..."
        sleep 5
    done
}

echo "running - apt-get update"
apt-get update

waitForAptUpdates

echo "Installing curl"
apt-get install -y curl

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
JOB_MANAGER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-job-manager
RUNNER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-runner
SCAN_REQUEST_SENDER_SHARED_LOCATION=$AZ_BATCH_NODE_SHARED_DIR/batch-scan-request-sender
mkdir -p "$JOB_MANAGER_SHARED_LOCATION"
mkdir -p "$RUNNER_SHARED_LOCATION"
mkdir -p "$SCAN_REQUEST_SENDER_SHARED_LOCATION"

cd "$JOB_MANAGER_SHARED_LOCATION"
echo "Installing job manager dependencies"
npm install yargs@13.2.1

cd "$RUNNER_SHARED_LOCATION"
echo "Installing runner dependencies"
npm install yargs@13.2.1 puppeteer@1.12.2 axe-core@3.2.2 axe-puppeteer@1.0.0

cd "$SCAN_REQUEST_SENDER_SHARED_LOCATION"
echo "Installing scan request sender dependencies"
npm install yargs@13.2.1

echo "Invoking custom pool startup script"
"${0%/*}/custom-pool-post-startup.sh"
echo "Successfully completed pool startup script execution."
