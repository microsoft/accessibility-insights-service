#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

export clientId
export clientSecret
export authorityUrl
export waitTimeBeforeEvaluationInMinutes
export evaluationIntervalInMinutes
export releaseId
export baseUrl

exitWithUsageInfo() {
    echo "
Usage: $0 -i <client id> -s <client secret> -a <authorityUrl> -w <wait time before evalutation in minutes> -e <evaluation interval in minutes> -r <releaseId> -b <baseUrl>
"
    exit 1
}

# Read script arguments
while getopts ":i:s:a:w:e:r:b:" option; do
    case $option in
    i) clientId=${OPTARG} ;;
    s) clientSecret=${OPTARG} ;;
    a) authorityUrl=${OPTARG} ;;
    w) waitTimeBeforeEvaluationInMinutes=${OPTARG} ;;
    e) evaluationIntervalInMinutes=${OPTARG} ;;
    r) releaseId=${OPTARG} ;;
    b) baseUrl=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

# Print script usage help
if [[ -z $clientId ]] || [[ -z $clientSecret ]] || [[ -z $authorityUrl ]] || [[ -z $waitTimeBeforeEvaluationInMinutes ]] || [[ -z $evaluationIntervalInMinutes ]] || [[ -z $releaseId ]] || [[ -z $baseUrl ]]; then
    exitWithUsageInfo
fi

node "${0%/*}/../../../functional-tests/dist/validate-e2e.js" --clientId=$1 --clientSecret=$2 --authorityUrl=$3 --waitTimeBeforeEvaluationInMinutes=$4 --evaluationIntervalInMinutes=$5 --releaseId=$6 --baseUrl=$7
