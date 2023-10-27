#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Open browser in automation mode

set -eo pipefail

exitWithUsageInfo() {
    echo "
Usage: ${BASH_SOURCE} -b <browser application path> [-p <profile location path>]
"
    exit 1
}

while getopts ":b:p:" option; do
    case $option in
    b) browserPath=${OPTARG} ;;
    p) profilePath=${OPTARG} ;;
    *) exitWithUsageInfo ;;
    esac
done

if [[ -z ${browserPath} ]]; then
    exitWithUsageInfo
fi

if [[ -z ${profilePath} ]]; then
    absolutePath="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    profilePath="${absolutePath}/chrome-user-data"
fi

result=$(
    "${browserPath}" \
        --allow-pre-commit-input \
        --disable-background-networking \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-breakpad \
        --disable-client-side-phishing-detection \
        --disable-component-update \
        --disable-features=Translate,AcceptCHFrame,MediaRouter,OptimizationHints,Prerender2 \
        --disable-hang-monitor \
        --disable-ipc-flooding-protection \
        --disable-popup-blocking \
        --disable-prompt-on-repost \
        --disable-renderer-backgrounding \
        --disable-search-engine-choice-screen \
        --disable-sync \
        --enable-automation \
        --enable-blink-features=IdleDetection \
        --enable-features=NetworkServiceInProcess2 \
        --export-tagged-pdf \
        --force-color-profile=srgb \
        --metrics-recording-only \
        --no-first-run \
        --password-store=basic \
        --use-mock-keychain \
        --enable-remote-extensions \
        --disable-blink-features=AutomationControlled \
        --remote-debugging-port=0 \
        --flag-switches-begin \
        --flag-switches-end \
        --disable-nacl \
        --user-data-dir="${profilePath}" \
        --disable-dev-shm-usage \
        --no-sandbox \
        --disable-setuid-sandbox \
        --disable-gpu \
        --disable-webgl \
        --disable-webgl2 \
        --disable-features=BackForwardCache \
        --js-flags=--max-old-space-size=8192 \
        --window-size=1920,1080 \
        --auto-open-devtools-for-tabs \
        about:blank
)
