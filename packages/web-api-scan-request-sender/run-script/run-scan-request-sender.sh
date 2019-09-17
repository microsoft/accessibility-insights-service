# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-on-demand-scan-request-sender/node_modules

echo "Running Scan request sender for on demand requests"
nodejs sender.js
