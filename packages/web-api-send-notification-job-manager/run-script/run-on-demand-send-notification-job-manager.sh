# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-send-notification-job-manager/node_modules

echo "Running job manager"
nodejs web-api-send-notification-job-manager.js
