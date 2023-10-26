#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# Disable POSIX to Windows path conversion
export MSYS_NO_PATHCONV=1

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -p <provider path> -r <ARM line-separated resource strings>
"
    exit 1
}

# Read script arguments
previousFlag=""
for arg in "$@"; do
    case $previousFlag in
    -p) providerPath=$arg ;;
    -r) resourcePath=$arg ;;
    -?) exitWithUsageInfo ;;
    esac
    previousFlag=$arg
done

if [[ -z $providerPath ]] || [[ -z $resourcePath ]]; then
    exitWithUsageInfo
fi

shopt -s nocasematch
providerPathRegEx="/providers/${providerPath}/(.[^/]+)"
export resourceName=""

for resourcePath in $resourcePath; do
    if [[ $resourcePath =~ $providerPathRegEx ]]; then
        resourceName="${BASH_REMATCH[1]}"
        return
    fi
done

echo "Unable to find $providerPath in resource path $resourcePath"
