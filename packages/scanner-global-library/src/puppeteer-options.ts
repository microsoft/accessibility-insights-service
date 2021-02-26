// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Puppeteer from 'puppeteer';

export const defaultBrowserOptions: Puppeteer.BrowserOptions = {
    defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    },
};

export const defaultLaunchOptions: Puppeteer.LaunchOptions = {
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
    ...defaultBrowserOptions,
};
