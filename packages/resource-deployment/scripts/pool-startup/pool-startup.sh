#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

# intentionally ignored -e option for this file, to not interrupt retry logic
set -o pipefail

runWithRetry() {
    local retryCount=0
    local maxRetryCount=5

    until "${0%/*}/pool-startup-internal.sh"; do
        ((retryCount++))

        if ((retryCount == maxRetryCount)); then
            echo "Maximum retry count reached. Pool startup script failed"
            exit 1
        else
            echo "Retry count - $retryCount. Pool startup script failed"
        fi
    done

    echo "Successfully completed pool startup script execution after retry count - $retryCount"
    exit 0
}

runWithRetry
