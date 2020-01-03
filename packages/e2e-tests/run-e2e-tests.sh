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
Usage: $0 -s <subscription> -g <resource group> -u <scan url> -a <api version> -c <client id> -t <client secret> -o <authority url>
"
    exit 1
}

getApiBaseUrl() {
    # Login to Azure if required
    if ! az account show 1>/dev/null; then
        az login
    fi

    az account set --subscription "$subscription"

    baseUrl=$(az apim list --resource-group kepowneltest --query "[].gatewayUrl" -o tsv)

    if [ -z $baseUrl ]; then
        echo "Could not find base url for api management instance"
    fi
}

# Read script arguments
while getopts ":s:g:u:b:a:c:t:o:" option; do
    case $option in
    s) subscription=${OPTARG} ;;
    g) resourceGroup=${OPTARG} ;;
    u) scanUrl=${OPTARG} ;;
    a) apiVersion=${OPTARG} ;;
    c) clientId=${OPTARG} ;;
    t) clientSecret=${OPTARG} ;;
    o) authorityUrl=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $subscription ]] || [[ -z $resourceGroup ]] || [[ -z $scanUrl ]] || [[ -z $apiVersion ]] || [[ -z $clientId ]] || [[ -z $clientSecret ]] || [[ -z $authorityUrl ]]; then
    exitWithUsageInfo
fi

getApiBaseUrl

yarn e2e
