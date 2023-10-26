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
        echo "Created process with pid $! for command ${command}"
        parallelizableProcesses+=("$!")
    done

    waitForProcesses parallelizableProcesses
}

function killProcess() {
    local processId=$1

    if [[ -z $processId ]]; then
        return
    fi

    killDescendantProcesses "$processId"

    echo "Killing process $processId"
    kill -SIGKILL "$processId" 2>/dev/null
}

function killDescendantProcesses() {
    local parentProcessId=$1
    local children
    local os=$(uname -s 2>/dev/null) || true

    if [[ $os == "Linux" ]] || [[ $os == "Darwin" ]]; then
        # Linux or macOS
        children=$(pgrep -P "$parentProcessId" 2>/dev/null) || true

        for child in ${children}; do
            local childId="${child//[$'\t\r\n ']/}"

            killProcess "$childId"
        done
    else
        # Windows
        children=$(wmic process where "Description='bash.exe'" get ProcessId 2>/dev/null)
        children="${children//[$'ProcessId']/}"

        for child in ${children}; do
            local childId="${child//[$'\t\r\n ']/}"

            if [[ -n $childId ]]; then
                commandline=$(wmic process where "ProcessId='$childId'" get Commandline 2>/dev/null)

                # Keep main terminal process
                if [[ "$commandline" != *--login* ]]; then
                    echo "Killing process $childId"
                    taskkill /pid "$childId" /f >/dev/null 2>&1 || true
                fi
            fi
        done
    fi
}
