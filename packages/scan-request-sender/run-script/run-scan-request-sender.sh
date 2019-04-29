#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-scan-request-sender/node_modules
echo "Running scan request sender"
npm install yargs@13.2.1
nodejs sender.js