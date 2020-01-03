#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export scanUrl
export baseUrl
export apiVersion
export clientId
export clientSecret
export authorityUrl

exitWithUsageInfo() {
    echo "
Usage: $0 -s <scan url> -b <api base url> -a <api version> -c <client id> -t <client secret> -u <authority url>
"
    exit 1
}

# Read script arguments
while getopts ":s:b:a:c:t:u:" option; do
    case $option in
    s) scanUrl=${OPTARG} ;;
    b) baseUrl=${OPTARG} ;;
    a) apiVersion=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    t) clientSecret=${OPTARG} ;;
    u) authorityUrl=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $scanUrl ]] || [[ -z $baseUrl ]] || [[ -z $apiVersion ]] || [[ -z $clientId ]] || [[ -z $clientSecret ]] || [[ -z $authorityUrl ]]; then
    exitWithUsageInfo
fi

yarn e2e
