#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-scanner/node_modules
nodejs scan-url.js --id=$1 --name=$2 --baseUrl=$3 --scanUrl=$4 --serviceTreeId=$5
