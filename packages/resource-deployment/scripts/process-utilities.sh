#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

function waitForProcesses() {
    local processesToWaitFor=$1

    list="${processesToWaitFor}[@]"
    for pid in "${!list}"; do
        echo "Waiting for process with pid ${pid}"
        wait "${pid}"
        local processExitCode=$?
        echo "Process with pid ${pid} exited with exit code ${processExitCode}"

        if [[ ${processExitCode} != 0 ]]; then
            echo "Process - ${pid} failed with exit code ${processExitCode}. Killing current process."
            exit "${processExitCode}"
        fi
    done
}

function runCommandsWithoutSecretsInParallel {
    local commands=$1
    local -a parallelizableProcesses

    local list="${commands}[@]"
    for command in "${!list}"; do
        eval "${command}" &
        echo "Created process with pid $! for command - ${command}"
        parallelizableProcesses+=("$!")
    done

    waitForProcesses parallelizableProcesses
}

function sendSignalToProcessIfExists {
    local currentPid=$1
    local signal=$2

    if [[ -z ${currentPid} ]]; then
        return
    fi

    if kill -0 "${currentPid}" >/dev/null 2>&1; then
        kill "${signal}" "${currentPid}"
    fi
}

function killWithDescendantsIfProcessExists() {
    local currentPid=$1

    if [[ -z ${currentPid} ]]; then
        return
    fi

    if kill -0 "${currentPid}" >/dev/null 2>&1; then
        echo "Stopping process ${currentPid}"
        sendSignalToProcessIfExists "${currentPid}" -SIGSTOP

        killDescendantProcesses "${currentPid}"
        echo "Killed descendant processes of ${currentPid}"

        sendSignalToProcessIfExists "${currentPid}" -SIGKILL
        echo "Killed process ${currentPid}"
    fi
}

function killDescendantProcesses() {
    local processId=$1
    local children
    local os=$(uname -s 2>/dev/null) || true

    if [[ $os == "Linux" ]] || [[ $os == "Darwin" ]]; then
        # Linux or macOS
        children=$(pgrep -P "${processId}")
    else
        # Windows
        children=$(wmic process where \(ParentProcessId="${processId}"\) get ProcessId | more +1)
    fi

    for child in ${children}; do
        local childId="${child//[$'\t\r\n ']/}"

        killWithDescendantsIfProcessExists "${childId}"
    done
}
