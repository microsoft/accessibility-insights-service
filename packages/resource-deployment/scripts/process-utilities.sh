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
        local pExitCode=$?
        echo "Process with pid $pid exited with exit code $pExitCode"

        if [[ $pExitCode != 0 ]]; then
            echo "Process - $pid failed with exit code $pExitCode. Killing current proccess."
            exit $pExitCode
        fi

    done
}

function runCommandsWithoutSecretsInParallel {
    local commands=$1
    local -a parallelizableProcesses

    local list="$commands[@]"
    for command in "${!list}"; do
        eval "$command" &
        echo "Created process with pid $! for command - $command"
        parallelizableProcesses+=("$!")
    done

    waitForProcesses parallelizableProcesses
} 

function sendSignalToProcessIfExists {
    local currentPid=$1	
    local signal=$2

    if [[ -z $currentPid ]]; then	
        return	
    fi	

    if kill -0 $currentPid > /dev/null 2>&1; then	
        kill $signal $currentPid
    fi
}

function killWithDecendentsIfProcessExists ()	
{	
    local currentPid=$1	

    if [[ -z $currentPid ]]; then	
        return	
    fi	

    if kill -0 $currentPid > /dev/null 2>&1; then	
        echo "stopping process $currentPid"	
        sendSignalToProcessIfExists $currentPid -SIGSTOP
       
        killDescendentProcesses  $currentPid
        echo "Killed descendent processes of $currentPid"

        sendSignalToProcessIfExists $currentPid -SIGKILL
        echo "killed process $currentPid"	
    fi	
}	

function killDescendentProcesses() {
    local processId=$1
    
    local children=$(pgrep -P $processId)	
    
    for childPid in $children; do	
        killWithDecendentsIfProcessExists "$childPid"	
    done	
}
