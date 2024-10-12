// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { exec } from 'child_process';
import * as fs from 'fs';
import { PromiseUtils, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';
import * as Puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { isEmpty } from 'lodash';
import { StealthPluginType } from './stealth-plugin-type';
import { defaultBrowserOptions, launchOptions } from './puppeteer-options';
import { ExtensionLoader } from './browser-extensions/extension-loader';
import { UserAgentPlugin } from './user-agent-plugin';
import { BrowserCache } from './browser-cache';

export interface WebDriverCapabilities {
    webgl?: boolean;
}

export interface WebDriverConfigurationOptions {
    browserExecutablePath?: string;
    clearDiskCache?: boolean;
    keepUserData?: boolean;
    capabilities?: WebDriverCapabilities;
    emulateEdge?: boolean;
}

@injectable()
export class WebDriver {
    public userDataDirectory = `${__dirname}/browser-data`;

    public browser: Puppeteer.Browser;

    private readonly browserCloseTimeoutMsecs = 10000;

    constructor(
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(UserAgentPlugin) private readonly userAgentPlugin: UserAgentPlugin,
        @inject(BrowserCache) private readonly browserCache: BrowserCache,
        @inject(GlobalLogger) @optional() private readonly logger: Logger,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
        private readonly puppeteerExtra: typeof PuppeteerExtra = PuppeteerExtra,
        private readonly stealthPlugin: StealthPluginType = StealthPlugin(),
    ) {}

    public async waitForPageCreation(): Promise<boolean> {
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
        this.logger?.logInfo('Browser instance connected.', { wsEndpoint });

        return this.browser;
    }

    /**
     * The method launches a browser instance with given arguments.
     * @default options = { clearDiskCache: true, keepUserData: false, capabilities: { webgl: false } }
     */
    public async launch(options?: WebDriverConfigurationOptions): Promise<Puppeteer.Browser> {
        this.setupPuppeteerPlugins(options);

        if (options?.keepUserData !== true) {
            fs.rmSync(this.userDataDirectory, { recursive: true, force: true });
        }

        if (options?.clearDiskCache !== false) {
            this.browserCache.clearStorage();
        }

        const browserLaunchOptions = this.createLaunchOptions(options);
        this.browser = await this.puppeteerExtra.launch({
            ...browserLaunchOptions,
            executablePath: options?.browserExecutablePath ?? Puppeteer.executablePath(),
        });

        this.logger?.logInfo('Browser instance started.', { options: JSON.stringify(options) });

        return this.browser;
    }

    public async close(): Promise<void> {
        const processName = 'chrome.exe';

        if (this.browser !== undefined) {
            const closeBrowser = async () => {
                try {
                    await this.browser.close();
                } catch (error) {
                    this.logger?.logError('An error occurred while closing browser.', { error: System.serializeError(error) });
                }
            };

            await this.promiseUtils.waitFor(closeBrowser(), this.browserCloseTimeoutMsecs, async () => {
                this.logger?.logWarn(`Browser did not close after ${this.browserCloseTimeoutMsecs} msec.`);
            });

            // https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill
            let terminated = false;
            exec(`taskkill /im ${processName} /f /t`, (error, stdout) => {
                if (error && !error.message.includes('not found')) {
                    this.logger?.logError('An error occurred while terminating browser process.', {
                        error: System.serializeError(error),
                    });
                }

                if (!isEmpty(stdout) && !stdout.includes('not found')) {
                    this.logger?.logInfo(`End ${processName} process.\n${stdout}`);
                }

                terminated = true;
            });

            await System.waitLoop(
                async () => terminated,
                async (completed) => completed === true,
            );

            this.browser = undefined;
            this.logger?.logInfo('Browser instance closed.');
        }
    }

    private createLaunchOptions(
        configurationOptions: WebDriverConfigurationOptions,
    ): Puppeteer.LaunchOptions & Puppeteer.BrowserLaunchArgumentOptions {
        const options = {
            ...launchOptions({ ...configurationOptions?.capabilities }),
            // The new headless mode https://developer.chrome.com/articles/new-headless
            headless: process.env.HEADLESS === 'false' ? false : 'new',
            devtools: process.env.DEV_TOOLS === 'true' ? true : false,
        };

        // Define user profile location to be able reuse it if requested.
        options.args.push(`--user-data-dir=${this.userDataDirectory}`);

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

        return options as Puppeteer.LaunchOptions;
    }

    private setupPuppeteerPlugins(configurationOptions: WebDriverConfigurationOptions): void {
        // Disable iframe.contentWindow evasion to avoid interference with privacy banner
        this.stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
        // Disable user-agent-override evasion as it will not set User Agent string in headless mode
        this.stealthPlugin.enabledEvasions.delete('user-agent-override');
        // Plugin to hide puppeteer automation from a webserver
        this.puppeteerExtra.use(this.stealthPlugin);
        // Custom user agent plugin to override default user agent string
        this.userAgentPlugin.emulateEdge = configurationOptions?.emulateEdge;
        this.puppeteerExtra.use(this.userAgentPlugin);
    }
}
