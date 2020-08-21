// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import * as Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;
    public userAgent: string;

    constructor(@inject(GlobalLogger) private readonly logger: Logger, private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            headless: true,
            args: ['--disable-dev-shm-usage'],
        });
        // convert to headful user agent to prevent web site from blocking an access
        this.userAgent = (await this.browser.userAgent()).replace('HeadlessChrome', 'Chrome');
        this.logger.logInfo('Chromium browser instance started.');

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
            this.logger.logInfo('Chromium browser instance stopped.');
        }
    }
}
