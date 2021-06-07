// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    private readonly browserCloseTimeout = 60000;

    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
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
            await this.promiseUtils.waitFor(this.closeBrowser(), this.browserCloseTimeout, async () => {
                this.logger?.logError(`Browser failed to close with timeout of ${this.browserCloseTimeout} ms.`);
                if (this.browser.process()) {
                    this.logger?.logInfo('Sending kill signal to browser process');
                    this.browser.process().kill('SIGINT');
                }
            });

            this.logger?.logInfo('Chromium browser instance stopped.');
        }
    }

    private async closeBrowser(): Promise<void> {
        const browserPages = await this.browser.pages();
        await Promise.all(browserPages.map((p) => p.close()));
        await this.browser.close();
    }
}
