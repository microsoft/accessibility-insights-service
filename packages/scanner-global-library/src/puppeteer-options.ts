// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { WebDriverCapabilities } from './web-driver';
import { puppeteerTimeoutConfig } from './page-timeout-config';

export const defaultBrowserOptions: Puppeteer.BrowserConnectOptions = {
    defaultViewport: null,
};

export const windowSize = {
    width: 1920,
    height: 1080,
};

const defaultArgs = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--disable-features=BackForwardCache',
    '--js-flags=--max-old-space-size=8192',
    `--window-size=${windowSize.width},${windowSize.height}`,
];

const webglArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu'];

const noWebglArgs = ['--disable-webgl', '--disable-webgl2'];

const defaultLaunchOptions: Puppeteer.PuppeteerNodeLaunchOptions = {
    // The new headless mode https://developer.chrome.com/articles/new-headless
    headless: true,
    protocolTimeout: 90000,
    ...defaultBrowserOptions,
};

export function launchOptions(capabilities?: WebDriverCapabilities): Puppeteer.PuppeteerNodeLaunchOptions {
    if (capabilities?.webgl === true) {
        puppeteerTimeoutConfig.navigationTimeoutMsec = puppeteerTimeoutConfig.webglNavigationTimeoutMsec;

        return { ...defaultLaunchOptions, args: [...defaultArgs, ...webglArgs] };
    }

    puppeteerTimeoutConfig.navigationTimeoutMsec = puppeteerTimeoutConfig.defaultNavigationTimeoutMsec;

    return { ...defaultLaunchOptions, args: [...defaultArgs, ...noWebglArgs] };
}
