// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';
import { ModHttpHeader } from './browser-extensions/mod-http-header';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    private readonly browserCloseTimeoutMsecs = 60000;

    constructor(
        @inject(ModHttpHeader) private readonly modHttpHeader: ModHttpHeader,
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
        if (process.env.MOD_HTTP_HEADER === 'true') {
            this.browser = await this.modHttpHeader.launchWithExtension(browserExecutablePath);
        } else {
            const options = {
                ...defaultLaunchOptions,
                headless: process.env.HEADLESS === 'false' ? false : true,
            };
            this.browser = await this.puppeteer.launch({
                executablePath: browserExecutablePath,
                ...options,
            });
        }

        this.logger?.logInfo('Chromium browser instance started.');

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.promiseUtils.waitFor(this.closeBrowser(), this.browserCloseTimeoutMsecs, async () => {
                this.logger?.logError(`Browser failed to close with timeout of ${this.browserCloseTimeoutMsecs} ms.`);
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
