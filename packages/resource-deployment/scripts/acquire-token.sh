#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

export clientId
export clientSecret
export authorityUrl

exitWithUsageInfo() {
    echo "
Usage: $0 -i <client id> -s <client secret> -a <authorityUrl>
"
    exit 1
}

# Read script arguments
while getopts ":i:s:a:" option; do
    case $option in
    i) clientId=${OPTARG} ;;
    s) clientSecret=${OPTARG} ;;
    a) authorityUrl=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $clientId ]] || [[ -z $clientSecret ]] || [[ -z $authorityUrl ]]; then
    exitWithUsageInfo
    exit 1
fi

url="$authorityUrl/oauth2/token?api-version="
body="grant_type=client_credentials&client_id=$clientId&resource=$clientId&client_secret=$client_secret"

response=$(
    curl "$url" -X POST \
        -H "Content-Type" -H "Accept-Charset:utf-8" \
        -d "$body"
)

echo $response
