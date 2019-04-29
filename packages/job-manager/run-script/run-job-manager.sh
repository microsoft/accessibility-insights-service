#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-job-manager/node_modules
echo "Running job manager"
npm install yargs@13.2.1
nodejs index.js
