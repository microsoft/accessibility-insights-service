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
    headless: true,
    args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--js-flags=--max-old-space-size=8192',
        `--window-size=${windowSize.width},${windowSize.height}`,
    ],
    ...defaultBrowserOptions,
};
