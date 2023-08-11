#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

if [[ -z $packagesDirectoryPath ]]; then
    packagesDirectoryPath="${0%/*}/../.."
fi

if [[ -z $profileName ]]; then
    profileName="dev"
fi

exitWithUsageInfo() {
    echo "
Usage: $0 -d <Packages directory. Default: $packagesDirectoryPath > -p <Profile name. Default: $profileName>
"
    exit 1
}

while getopts "d:p:" option; do
    case $option in
    d) packagesDirectoryPath=${OPTARG} ;;
    p) profileName=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

echo "Packages directory: $packagesDirectoryPath"
if [[ ! -d "$packagesDirectoryPath" ]]; then
    echo "Path - $packagesDirectoryPath does not exist"
    exitWithUsageInfo
fi

echo "Setup docker image binaries"
cp -rf "${0%/*}/docker-image/"*.* "$packagesDirectoryPath/web-api-scan-runner/dist"
cp -rf "${0%/*}/docker-image/"*.* "$packagesDirectoryPath/privacy-scan-runner/dist"
cp -rf "${0%/*}/docker-image/"*.* "$packagesDirectoryPath/report-generator-runner/dist"

echo "Setup resource deployment templates"
cp -f "${0%/*}/resource-deployment/templates/"*.* "$packagesDirectoryPath/resource-deployment/dist/templates"
