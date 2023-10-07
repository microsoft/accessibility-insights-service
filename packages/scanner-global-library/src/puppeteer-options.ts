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
    args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-webgl',
        '--disable-webgl2',
        '--disable-features=BackForwardCache',
        '--js-flags=--max-old-space-size=8192',
        `--window-size=${windowSize.width},${windowSize.height}`,
    ],
    protocolTimeout: 30000,
    ...defaultBrowserOptions,
};
