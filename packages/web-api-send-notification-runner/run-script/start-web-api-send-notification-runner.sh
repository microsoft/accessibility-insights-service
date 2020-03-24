# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
#!/bin/bash
export NODE_PATH=$AZ_BATCH_NODE_SHARED_DIR/batch-web-api-send-notification-runner/node_modules

echo "Starting Notification Sender Runner"
nodejs web-api-send-notification-runner.js --scanId=$1 --scanNotifyUrl=$2 --runStatus=$3 --scanStatus=$4
