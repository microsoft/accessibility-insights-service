# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-scan-request-sender/node_modules

echo "Running Scan request sender"
nodejs sender.js