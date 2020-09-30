// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
    ) {}

    public async launch(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            executablePath: browserExecutablePath,
            headless: true,
            args: ['--disable-dev-shm-usage'],
            defaultViewport: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            },
        });
        this.logger?.logInfo('Chromium browser instance started.');

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
            this.logger?.logInfo('Chromium browser instance stopped.');
        }
    }
}
