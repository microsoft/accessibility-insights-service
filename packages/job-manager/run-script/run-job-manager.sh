#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-job-manager/node_modules

echo "Installing dependencies"
npm install yargs@13.2.1

echo "Running job manager"
nodejs index.js
