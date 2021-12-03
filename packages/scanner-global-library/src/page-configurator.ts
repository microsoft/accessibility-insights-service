// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class PageConfigurator {
    private userAgent: string;

    private readonly windowWidth = 1920;

    private readonly windowHeight = 1080;

    public getUserAgent(): string {
        return this.userAgent;
    }

    public async configurePage(page: Puppeteer.Page): Promise<void> {
        await page.setBypassCSP(true);
        await page.setCacheEnabled(false); // disable cache to allow page reload
        await page.setViewport({
            width: this.windowWidth,
            height: this.windowHeight,
            deviceScaleFactor: 1,
        });

        await this.setUserAgent(page);
    }

    public getBrowserResolution(): string {
        return `${this.windowWidth}x${this.windowHeight}`;
    }

    private async setUserAgent(page: Puppeteer.Page): Promise<void> {
        const browser = page.browser();
        this.userAgent = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
        await page.setUserAgent(this.userAgent);
    }
}
