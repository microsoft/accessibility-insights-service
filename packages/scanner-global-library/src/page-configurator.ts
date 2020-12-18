// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { Page } from 'puppeteer';

@injectable()
export class PageConfigurator {
    private userAgent: string;
    private readonly windowWidth = 1920;
    private readonly windowHeight = 1080;

    public getUserAgent(): string {
        return this.userAgent;
    }

    public async configurePage(page: Page): Promise<void> {
        await page.setBypassCSP(true);
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

    private async setUserAgent(page: Page): Promise<void> {
        const browser = page.browser();
        this.userAgent = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
        await page.setUserAgent(this.userAgent);
    }
}
