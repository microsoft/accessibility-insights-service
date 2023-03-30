// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin, PluginOptions, PluginRequirements } from 'puppeteer-extra-plugin';
import Puppeteer, { Protocol } from 'puppeteer';
import { inject, injectable } from 'inversify';
import { iocTypes, SecretVault } from './ioc-types';

@injectable()
export class UserAgentPlugin extends PuppeteerExtraPlugin {
    public static Name = 'user-agent-plugin';

    private secretVault: SecretVault;

    constructor(
        @inject(iocTypes.SecretVaultProvider) private readonly secretVaultProvider: () => Promise<SecretVault>,
        opts: PluginOptions = undefined,
    ) {
        super(opts);
    }

    public get name(): string {
        return UserAgentPlugin.Name;
    }

    public get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    public async onPageCreated(page: Puppeteer.Page): Promise<void> {
        this.secretVault = await this.secretVaultProvider();

        const userAgentString = await this.getUserAgentString(page);
        const userAgentMetadata = await this.getUserAgentMetadata(page);

        await page.setUserAgent(userAgentString, userAgentMetadata);
    }

    private async getUserAgentString(page: Puppeteer.Page): Promise<string> {
        // Set to Linux to disable default Windows user authentication fallback
        const platform = 'X11; Linux x86_64';

        let userAgent = await page.browser().userAgent();
        userAgent = userAgent.replace(/([^(]*\()([^)]*)(.*)/i, `$1${platform}$3`);

        // Remove Headless flag
        userAgent = userAgent.replace('HeadlessChrome/', 'Chrome/');

        // Add bypass key
        userAgent = `${userAgent} Web-Scanner-Bypass/${this.secretVault.webScannerBypassKey}`;

        return userAgent;
    }

    private async getUserAgentMetadata(page: Puppeteer.Page): Promise<Protocol.Emulation.UserAgentMetadata> {
        const brands = await this.getBrands(page);
        const browserVersion = await page.browser().version();
        const fullVersion = browserVersion.match(/Chrome\/([\d|.]+)/)[1];

        return {
            brands,
            fullVersion,
            platform: 'Linux',
            platformVersion: '',
            architecture: 'x86',
            model: '',
            mobile: false,
            bitness: '64',
        };
    }

    private async getBrands(page: Puppeteer.Page): Promise<Protocol.Emulation.UserAgentBrandVersion[]> {
        const browserVersion = await page.browser().version();
        const version = browserVersion.match(/Chrome\/(\d+)\.(.*)/i)[1];

        return [
            {
                brand: 'Google Chrome',
                version: `${version}`,
            },
            {
                brand: 'Chromium',
                version: `${version}`,
            },
            {
                brand: 'Not(A.Brand',
                version: '8',
            },
        ];
    }
}
