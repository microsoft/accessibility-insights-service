#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -p <provider path> -r <ARM line-separated resource strings>
"
    exit 1
}

# Read script arguments
previousFlag=""
for arg in "$@"; do
    case $previousFlag in
    -p) providerPath=$arg ;;
    -r) resourcePaths=$arg ;;
    -?) exitWithUsageInfo ;;
    esac
    previousFlag=$arg
done

if [[ -z $providerPath ]] || [[ -z $resourcePaths ]]; then
    exitWithUsageInfo
    exit 1
fi

shopt -s nocasematch
providerPathRegEx="/providers/${providerPath}/(.[^/]+)"
export resourceName=""

for resourcePath in $resourcePaths; do
    if [[ $resourcePath =~ $providerPathRegEx ]]; then
        resourceName="${BASH_REMATCH[1]}"
        return
    fi
done

echo "unable to find $providerPath in resource paths - $resourcePaths"
