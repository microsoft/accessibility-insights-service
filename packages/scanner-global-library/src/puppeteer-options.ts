// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

export const windowSize = {
    width: 1920,
    height: 1080,
};

export const defaultBrowserOptions: Puppeteer.BrowserConnectOptions = {
    defaultViewport: null,
};

export const defaultLaunchOptions: Puppeteer.PuppeteerNodeLaunchOptions = {
    // The new headless mode https://developer.chrome.com/articles/new-headless
    headless: 'new',
    // To enable WebGL in docker container use --use-gl=angle and --in-process-gpu options
    // and without --use-angle=swiftshader and --disable-gpu
    args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=BackForwardCache',
        '--js-flags=--max-old-space-size=8192',
        '--use-gl=angle',
        '--in-process-gpu',
        `--window-size=${windowSize.width},${windowSize.height}`,
    ],
    protocolTimeout: 90000,
    ...defaultBrowserOptions,
};
