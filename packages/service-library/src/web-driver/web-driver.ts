// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import * as Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(@inject(GlobalLogger) private readonly logger: Logger, private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            headless: true,
            timeout: 15000,
            args: ['--disable-dev-shm-usage'],
        });
        this.logger.logInfo('Puppeteer browser is started.');

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
            this.logger.logInfo('Puppeteer browser has stopped.');
        }
    }
}
