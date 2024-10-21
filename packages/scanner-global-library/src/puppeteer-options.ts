// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { WebDriverCapabilities } from './web-driver';

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
    '--disable-smooth-scrolling',
    '--js-flags=--max-old-space-size=8192',
    `--window-size=${windowSize.width},${windowSize.height}`,
];

// Hardware OpenGL does not work in container environment. We need to use SwANGLE as
// an alternative software OpenGL implementation. Below are two options to enable it.
// Option 1) will make compositing and raster work fully for WebGL pages.
// Option 2) doesn't work right now. Chrome won't show WebGL page in container environment.
// Option 3) is required to enable WebGL in container environment.

// 1) '--disable-gpu' This forces Chrome to use the software path for compositing and raster.
// WebGL will still work using SwANGLE.
// 2) '--use-gl=angle', '--use-angle=swiftshader' This switches Chrome to use SwANGLE
// for compositing, (maybe) raster and WebGL.
// 3) '--in-process-gpu' Required. This enables WebGL rendering in container environment.

const webglArgs = ['--disable-gpu', '--in-process-gpu'];
const noWebglArgs = ['--disable-webgl', '--disable-webgl2', '--disable-accelerated-2d-canvas', '--disable-gpu-program-cache'];

const defaultLaunchOptions: Puppeteer.PuppeteerNodeLaunchOptions = {
    // The new headless mode https://developer.chrome.com/articles/new-headless
    headless: true,
    ...defaultBrowserOptions,
};

export function launchOptions(capabilities?: WebDriverCapabilities): Puppeteer.PuppeteerNodeLaunchOptions {
    if (capabilities?.webgl === true) {
        return { ...defaultLaunchOptions, args: [...defaultArgs, ...webglArgs] };
    }

    return { ...defaultLaunchOptions, args: [...defaultArgs, ...noWebglArgs] };
}
