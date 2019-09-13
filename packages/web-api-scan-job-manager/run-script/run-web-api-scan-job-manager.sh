# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-job-manager/node_modules

echo "Running job manager"
nodejs web-api-scan-job-manager.js
