# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-scan-runner/node_modules

echo "Starting runner"
nodejs web-api-scan-runner.js --id=$1 --url=$2 --batchRequestId=$3
