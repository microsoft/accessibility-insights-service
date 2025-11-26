// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { WebDriverCapabilities } from './web-driver';

export const defaultBrowserOptions: Puppeteer.ConnectOptions = {
    defaultViewport: null,
};

export const windowSize = {
    width: 1920,
    height: 1080,
};

const defaultArgs = [
    '--no-sandbox',
    '--no-zygote',
    '--restore-last-session', // needed for proper cookies handling for some sites with authentication
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--disable-features=BackForwardCache',
    '--disable-back-forward-cache',
    '--disable-smooth-scrolling',
    '--js-flags=--max-old-space-size=8192',
    `--window-size=${windowSize.width},${windowSize.height}`,
];

// Hardware OpenGL does not work in container environment. We need to use SwiftShader as
// an alternative software OpenGL implementation.
const webglArgs = ['--enable-webgl', '--enable-webgl2', '--use-angle=swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'];
// The '--disable-gpu' option is mandatory to avoid browser crashes in some environments, such as Docker containers.
const noWebglArgs = [
    '--disable-webgl',
    '--disable-webgl2',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu-program-cache',
    '--disable-gpu',
];

const defaultLaunchOptions: Puppeteer.LaunchOptions = {
    // The new headless mode https://developer.chrome.com/articles/new-headless
    headless: true,
    ...defaultBrowserOptions,
};

export function launchOptions(capabilities?: WebDriverCapabilities): Puppeteer.LaunchOptions {
    if (capabilities?.webgl === true) {
        return { ...defaultLaunchOptions, args: [...defaultArgs, ...webglArgs] };
    }

    return { ...defaultLaunchOptions, args: [...defaultArgs, ...noWebglArgs] };
}
