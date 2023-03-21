// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin, PluginOptions, PluginRequirements } from 'puppeteer-extra-plugin';
import Puppeteer, { Protocol } from 'puppeteer';

export class UserAgentPlugin extends PuppeteerExtraPlugin {
    constructor(opts?: PluginOptions) {
        super(opts);
    }

    public get name(): string {
        return 'user-agent-plugin';
    }

    public get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    public async onPageCreated(page: Puppeteer.Page): Promise<void> {
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
