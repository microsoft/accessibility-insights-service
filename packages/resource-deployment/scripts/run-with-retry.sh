#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090

# intentionally ignored -e option for this file, to not interrupt retry logic
set -eo pipefail

export maxRetryCount=5
export retryWaitTimeInSeconds=60
export maxCommandExecutionTimeInSeconds=600
export command

processKilled=false

killIfProcessExists ()
{
    local currentPid=$1
    processKilled=false

    if [[ -z $currentPid ]]; then
        return
    fi

    if kill -0 $currentPid > /dev/null 2>&1; then
        processKilled=true
        echo "stopping process $currentPid"
        kill -STOP $currentPid
        local children=$(pgrep -P $currentPid)

        for childPid in $children; do
            killIfProcessExists "$childPid"
        done

        kill -9 $currentPid
        echo "killed process $currentPid"
    fi
}

killProcessWithProcesstree() {
     local currentPid=$1

     pstree -p $currentPid

     killIfProcessExists "$currentPid"
}


exitWithUsageInfo() {
    echo "
Usage: $0 -c <command to execute> -maxRetryCount -r <max retry count> -t <command execution time> -w <retry wait time>
"
    exit 1
}

# Read script arguments
while getopts ":c:r:t:w:" option; do
    case $option in
    c) command=${OPTARG} ;;
    r) maxRetryCount=${OPTARG} ;;
    t) maxCommandExecutionTimeInSeconds=${OPTARG} ;;
    w) retryWaitTimeInSeconds=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done


if [[ -z $command ]]; then
    exitWithUsageInfo
fi

# intentionally ignored -e option for this file, to not interrupt retry logic
set +e

killCreatedProcesses() {
    echo "[run-with-retry] Exiting process $0"
    killProcessWithProcesstree $waitPid
    killProcessWithProcesstree $commandPid
}

trap 'killCreatedProcesses' EXIT

runWithRetry() {
    local commandRetryCount=0
    
    echo "Running command with max retry count $maxRetryCount"
    until false ; do
        ((commandRetryCount++))

        eval "$command" &
        commandPid=$!

        sleep $maxCommandExecutionTimeInSeconds &
        waitPid=$!

        wait -n
        local exitCode=$?
        echo "wait process / command exit code - $exitCode"

        killProcessWithProcesstree $waitPid
        killProcessWithProcesstree $commandPid

        if [[ $exitCode == 0 && $processKilled == false ]]; then
           break
        fi

        if [[ $commandRetryCount -eq $maxRetryCount ]]; then
            echo "Maximum retry count reached. command failed"
            exit 1
        else
            echo "Retry count - $commandRetryCount. command failed"
        fi

        sleep $retryWaitTimeInSeconds
    done

    echo "Successfully executed command after retry count - $commandRetryCount"
}

runWithRetry
