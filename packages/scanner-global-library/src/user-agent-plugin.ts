// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin, PluginOptions, PluginRequirements } from 'puppeteer-extra-plugin';
import * as Puppeteer from 'puppeteer';
import { inject, injectable, optional } from 'inversify';
import { isEmpty } from 'lodash';
import { iocTypes, SecretVault } from './ioc-types';
import { LoginPageDetector } from './authenticator/login-page-detector';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class UserAgentPlugin extends PuppeteerExtraPlugin {
    public static Name = 'user-agent-plugin';

    public emulateEdge: boolean;

    private readonly loadCompletedDataKey = 'loadCompleted';

    private readonly pluginData: Map<string, any> = new Map();

    private browserMajorVersion: string;

    constructor(
        @inject(iocTypes.SecretVaultProvider)
        @optional()
        private readonly secretVaultProvider: () => Promise<SecretVault> = () => Promise.resolve({ webScannerBypassKey: '1.0' }),
        @inject(LoginPageDetector) @optional() private readonly loginPageDetector: LoginPageDetector,
        private readonly userAgent: string = process.env.USER_AGENT,
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

    public get loadCompleted(): boolean {
        return this.pluginData.get(this.loadCompletedDataKey);
    }

    public async onPageCreated(page: Puppeteer.Page): Promise<void> {
        this.pluginData.delete(this.loadCompletedDataKey);
        await this.setUserAgent(page);
        this.pluginData.set(this.loadCompletedDataKey, true);
    }

    private async setUserAgent(page: Puppeteer.Page): Promise<void> {
        if (this.userAgent) {
            await page.setUserAgent(this.userAgent);
        } else {
            const userAgentString = await this.getUserAgentString(page);
            const userAgentMetadata = await this.getUserAgentMetadata(page);

            await page.setUserAgent(userAgentString, userAgentMetadata);
        }
    }

    private async getUserAgentString(page: Puppeteer.Page): Promise<string> {
        const secretVault = await this.secretVaultProvider();
        let userAgent = await page.browser().userAgent();
        userAgent = this.setUserAgentPlatform(userAgent, page);
        // Remove headless chromium flag
        userAgent = userAgent.replace(/Headless/g, '');
        // Emulate Edge user agent
        if (this.emulateEdge === true) {
            const majorVersion = await this.getBrowserMajorVersion(page);
            userAgent = `${userAgent} Edg/${majorVersion}.0.0.0`;
        }
        // Add scanner bypass key
        userAgent = `${userAgent} WebInsights/${secretVault.webScannerBypassKey}`;

        return userAgent;
    }

    private async getUserAgentMetadata(page: Puppeteer.Page): Promise<Puppeteer.Protocol.Emulation.UserAgentMetadata> {
        const brands = await this.getBrands(page);
        const browserVersion = await page.browser().version();
        const fullVersion = browserVersion.match(/Chrome\/([\d|.]+)/)[1];
        const platform = this.getPlatform();

        return {
            brands,
            fullVersion,
            platform,
            platformVersion: '',
            architecture: 'x86',
            model: '',
            mobile: false,
            bitness: '64',
            wow64: false,
        };
    }

    /**
     * Build HTTP Sec-CH-UA request header metadata
     * https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:components/embedder_support/user_agent_utils.cc
     */
    private async getBrands(page: Puppeteer.Page): Promise<Puppeteer.Protocol.Emulation.UserAgentBrandVersion[]> {
        const majorVersion = await this.getBrowserMajorVersion(page);
        const seed = Number(majorVersion);
        const brandOrder = [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
        ][seed % 6];
        const chars = [' ', '(', ':', '-', '.', '/', ')', ';', '=', '?', '_'];
        const versions = ['8', '99', '24'];
        const greaseBrand = `Not${chars[seed % chars.length]}A${chars[(seed + 1) % chars.length]}Brand`;
        const greaseVersion = versions[seed % versions.length];

        const brandList = [];
        brandList[brandOrder[0]] = {
            brand: greaseBrand,
            version: greaseVersion,
        };
        brandList[brandOrder[1]] = {
            brand: 'Chromium',
            version: `${majorVersion}`,
        };
        brandList[brandOrder[2]] = {
            brand: 'Google Chrome',
            version: `${majorVersion}`,
        };

        return brandList;
    }

    private async getBrowserMajorVersion(page: Puppeteer.Page): Promise<string> {
        if (isEmpty(this.browserMajorVersion)) {
            const browserVersion = await page.browser().version();
            this.browserMajorVersion = browserVersion.match(/Chrome\/(\d+)\.(.*)/i)[1];
        }

        return this.browserMajorVersion;
    }

    private setUserAgentPlatform(userAgent: string, page: Puppeteer.Page): string {
        // Set to Linux platform to disable authentication fallback to currently logged in Windows user
        const platform = 'X11; Linux x86_64';

        const authenticationType = this.loginPageDetector?.getAuthenticationType(page.url());
        if (authenticationType === undefined) {
            return userAgent;
        }

        return userAgent.replace(/([^(]*\()([^)]*)(.*)/i, `$1${platform}$3`);
    }

    private getPlatform(): string {
        const platform = process.platform;
        switch (platform) {
            case 'darwin':
                return 'macOS';
            case 'linux':
                return 'Linux';
            case 'win32':
                return 'Windows';
            default:
                return '';
        }
    }
}
