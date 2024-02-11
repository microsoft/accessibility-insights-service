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

const webglArgs: string[] = ['--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu'];

export const defaultLaunchOptions: Puppeteer.PuppeteerNodeLaunchOptions = {
    // The new headless mode https://developer.chrome.com/articles/new-headless
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--disable-features=BackForwardCache',
        '--js-flags=--max-old-space-size=8192',
        `--window-size=${windowSize.width},${windowSize.height}`,
        ...webglArgs,
    ],
    protocolTimeout: 90000,
    ...defaultBrowserOptions,
};
