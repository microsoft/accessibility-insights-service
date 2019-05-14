#!/bin/bash
set -eo pipefail

echo "Installing curl"
apt-get update && apt-get install -y curl

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
mkdir $JOB_MANAGER_SHARED_LOCATION
mkdir $RUNNER_SHARED_LOCATION
mkdir $SCAN_REQUEST_SENDER_SHARED_LOCATION

cd $JOB_MANAGER_SHARED_LOCATION
echo "Installing job manager dependencies"
npm install yargs@13.2.1 azure-batch@6.0.0

cd $RUNNER_SHARED_LOCATION
echo "Installing runner dependencies"
npm install yargs@13.2.1 puppeteer@1.12.2 axe-core@3.2.2 axe-puppeteer@1.0.0

cd $SCAN_REQUEST_SENDER_SHARED_LOCATION
echo "Installing scan request sender dependencies"
npm install yargs@13.2.1
