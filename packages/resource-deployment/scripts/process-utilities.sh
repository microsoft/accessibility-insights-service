#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

function waitForProcesses() {
    local processesToWaitFor=$1

    list="$processesToWaitFor[@]"
    for pid in "${!list}"; do
        echo "Waiting for process with pid $pid"
        wait $pid
        echo "Process with pid $pid exited"
    done
}

function runInParallel() {
    local processPaths=$1
    local -a parallelizableProcesses

    list="$processPaths[@]"
    for processPath in "${!list}"; do
        . "${processPath}" &
        echo "Created process with pid $! for process path - $processPath"
        parallelizableProcesses+=("$!")
    done

    waitForProcesses parallelizableProcesses
}
