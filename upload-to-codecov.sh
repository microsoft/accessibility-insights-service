#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Download the codecov uploader, check for integrity, and run
# (https://docs.codecov.com/docs/codecov-uploader#integrity-checking-the-uploader)

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: $0 -t <upload token>
"
    exit 1
}

function importPublicKey() {
    curl https://keybase.io/codecovsecurity/pgp_keys.asc | gpg --no-default-keyring --keyring trustedkeys.gpg --import
}

function downloadCodecov() {
    curl -Os https://uploader.codecov.io/latest/linux/codecov
    curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM
    curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM.sig
}

function verifySHASUM() {
    gpgv codecov.SHA256SUM.sig codecov.SHA256SUM
    shasum -a 256 -c codecov.SHA256SUM
}

function runCodecovUploader() {
    chmod +x codecov
    ./codecov -t "${token}"
}

# Read script arguments
while getopts ":t:" option; do
    case $option in
    t) token=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z "${token}" ]]; then
    exitWithUsageInfo
fi

importPublicKey
downloadCodecov
verifySHASUM
runCodecovUploader
