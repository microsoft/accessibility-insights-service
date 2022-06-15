// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { defaultBrowserOptions } from './puppeteer-options';

@injectable()
export class PageConfigurator {
    private userAgent: string;

    public getUserAgent(): string {
        return this.userAgent;
    }

    public async configurePage(page: Puppeteer.Page): Promise<void> {
        await page.setViewport(defaultBrowserOptions.defaultViewport);
        //@ts-expect-error
        await page._client.send('Emulation.clearDeviceMetricsOverride'); // enable page resizing to match to browser viewport

        await page.setBypassCSP(true);
        await this.setUserAgent(page);
    }

    public getBrowserResolution(): string {
        return `${defaultBrowserOptions.defaultViewport.width}x${defaultBrowserOptions.defaultViewport.height}`;
    }

    private async setUserAgent(page: Puppeteer.Page): Promise<void> {
        const browser = page.browser();
        this.userAgent = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
        await page.setUserAgent(this.userAgent);
    }
}
