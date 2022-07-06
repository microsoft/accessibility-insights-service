// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fsNode from 'fs';
import { PromiseUtils } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import Puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { StealthPluginType } from './stealth-plugin-type';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';
import { ExtensionLoader } from './browser-extensions/extension-loader';

export interface WebDriverConfigurationOptions {
    browserExecutablePath?: string;
    clearDiskCache?: boolean;
}

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    private readonly diskCacheDir = `${__dirname}/browser-cache`;

    private readonly browserCloseTimeoutMsecs = 60000;

    constructor(
        @inject(ExtensionLoader) private readonly extensionLoader: ExtensionLoader,
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
        private readonly puppeteerExtra: typeof PuppeteerExtra = PuppeteerExtra,
        private readonly stealthPlugin: StealthPluginType = StealthPlugin(),
        private readonly fs: typeof fsNode = fsNode,
    ) {}

    public async connect(wsEndpoint: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
            ...defaultBrowserOptions,
        });
        this.logger?.logInfo('Chromium browser instance connected.');

        return this.browser;
    }

    public async launch(options: WebDriverConfigurationOptions = { clearDiskCache: true }): Promise<Puppeteer.Browser> {
        this.addStealthPlugin();

        if (options.clearDiskCache === true) {
            this.fs.rmSync(this.diskCacheDir, { recursive: true, force: true });
        }

        const launchOptions = this.createLaunchOptions();
        this.browser = await this.puppeteerExtra.launch({
            ...launchOptions,
            executablePath: options.browserExecutablePath,
        });

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

    private createLaunchOptions(): Puppeteer.LaunchOptions & Puppeteer.BrowserLaunchArgumentOptions {
        const options = {
            ...defaultLaunchOptions,
            headless: process.env.HEADLESS === 'false' ? false : true,
            devtools: process.env.DEVTOOLS === 'true' ? true : false,
        };

        // Define browser cache location to allow reuse it after browser relaunch.
        // Browser profile (storage, settings, etc.) is not part of the cache and will be deleted after browser relaunch.
        options.args.push(`--disk-cache-dir=${this.diskCacheDir}`);

        const isDebugEnabled = /--debug|--inspect/i.test(process.execArgv.join(' '));
        if (isDebugEnabled === true) {
            options.args.push('--disable-web-security');
        }

        if (process.env.EXTENSION_NAME || process.env.EXTENSION_ID) {
            const extension = this.extensionLoader.getExtension(process.env.EXTENSION_NAME, process.env.EXTENSION_ID);
            options.args.push(...[`--disable-extensions-except=${extension.path}`, `--load-extension=${extension.path}`]);
        }

        return options;
    }

    private addStealthPlugin(): void {
        // Disable iframe.contentWindow evasion to avoid interference with privacy banner
        this.stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
        // Chromium browser extension to hide puppeteer automation from a webserver
        this.puppeteerExtra.use(this.stealthPlugin);
    }
}
