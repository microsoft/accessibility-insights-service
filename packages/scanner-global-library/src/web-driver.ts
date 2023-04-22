// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PromiseUtils, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import * as Puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { StealthPluginType } from './stealth-plugin-type';
import { defaultBrowserOptions, defaultLaunchOptions } from './puppeteer-options';
import { ExtensionLoader } from './browser-extensions/extension-loader';
import { UserAgentPlugin } from './user-agent-plugin';
import { BrowserCache } from './browser-cache';

export interface WebDriverConfigurationOptions {
    browserExecutablePath?: string;
    clearDiskCache?: boolean;
}

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    private readonly browserCloseTimeoutMsecs = 60000;

    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(UserAgentPlugin) private readonly userAgentPlugin: UserAgentPlugin,
        @inject(BrowserCache) private readonly browserCache: BrowserCache,
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
        private readonly puppeteerExtra: typeof PuppeteerExtra = PuppeteerExtra,
        private readonly stealthPlugin: StealthPluginType = StealthPlugin(),
    ) {}

    public async pageCreated(): Promise<boolean> {
        // Waiting for the last plugin in a plugins chain to complete processing
        const loadCompleted = await System.waitLoop(
            async () => this.userAgentPlugin.loadCompleted,
            async (completed) => completed === true,
        );

        return loadCompleted;
    }

    public async connect(wsEndpoint: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
            ...defaultBrowserOptions,
        });
        this.logger?.logInfo('Chromium browser instance connected.');

        return this.browser;
    }

    public async launch(options: WebDriverConfigurationOptions = { clearDiskCache: true }): Promise<Puppeteer.Browser> {
        this.addPuppeteerPlugins();

        if (options.clearDiskCache === true) {
            this.browserCache.clearStorage();
        }

        const launchOptions = this.createLaunchOptions();
        this.browser = await this.puppeteerExtra.launch({
            ...launchOptions,
            executablePath: options.browserExecutablePath ?? Puppeteer.executablePath(),
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
            devtools: process.env.DEV_TOOLS === 'true' ? true : false,
        };

        // Define browser cache location to allow reuse it after browser relaunch.
        // Browser profile (storage, settings, etc.) is not part of the cache and will be deleted after browser relaunch.
        options.args.push(`--disk-cache-dir=${this.browserCache.dirname}`);

        if (System.isDebugEnabled() === true) {
            // options.args.push('--disable-web-security'); // disable the same-origin policy
            options.args.push('--enable-remote-extensions');

            if (process.env.EXTENSION_NAME || process.env.EXTENSION_ID) {
                const extensionLoader = new ExtensionLoader();
                const extension = extensionLoader.getExtension(process.env.EXTENSION_NAME, process.env.EXTENSION_ID);
                options.args.push(...[`--load-extension=${extension.path}`]);
            }
        }

        return options;
    }

    private addPuppeteerPlugins(): void {
        // Disable iframe.contentWindow evasion to avoid interference with privacy banner
        this.stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
        // Disable user-agent-override evasion as it will not set User Agent string in headless mode
        this.stealthPlugin.enabledEvasions.delete('user-agent-override');
        // Plugin to hide puppeteer automation from a webserver
        this.puppeteerExtra.use(this.stealthPlugin);

        // Plugin to set non-Windows platform in user agent string
        this.puppeteerExtra.use(this.userAgentPlugin);
    }
}
