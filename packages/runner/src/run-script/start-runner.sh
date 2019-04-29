#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-runner/node_modules

echo "Installing dependencies"
npm install yargs@13.2.1
npm install puppeteer@1.12.2

echo "Starting runner"
nodejs runner.js --websiteId=$1 --websiteName=$2 --baseUrl=$3 --scanUrl=$4 --serviceTreeId=$5
