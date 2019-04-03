#!/bin/bash

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
mkdir $JOB_MANAGER_SHARED_LOCATION
mkdir $RUNNER_SHARED_LOCATION
cp batch-job-manager/package.json $JOB_MANAGER_SHARED_LOCATION
#cp batch-scanner/package.json $SCANNER_SHARED_LOCATION
cp batch-runner/package.json $RUNNER_SHARED_LOCATION
cd $JOB_MANAGER_SHARED_LOCATION
echo "Installing job manager dependencies"
npm install
cd $RUNNER_SHARED_LOCATION
echo "Installing runner dependencies"
npm install
