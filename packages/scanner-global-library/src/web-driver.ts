// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
    ) {}

    public async connect(wsEndpoint: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
            ...defaultBrowserOptions,
        });
        this.logger?.logInfo('Chromium browser instance connected.');

        return this.browser;
    }

    public async launch(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            executablePath: browserExecutablePath,
            ...defaultLaunchOptions,
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
