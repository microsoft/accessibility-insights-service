#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

exitWithUsageInfo() {
    echo "Usage: $0 -h <commit hash>"
    exit 1
}

while getopts ":h:" option; do
    case $option in
    h) commitHash=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z $commitHash ]]; then
    exitWithUsageInfo
fi

timestamp=$(date '+%Y-%m-%d')
tag="service@$timestamp"

echo "Creating release tag $tag for commit hash $commitHash"

git tag $tag $commitHash
git push origin $tag

echo "Release tag has been created successfully"
