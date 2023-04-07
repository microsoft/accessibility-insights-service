// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin, PluginOptions, PluginRequirements } from 'puppeteer-extra-plugin';
import * as Puppeteer from 'puppeteer';
import { inject, injectable } from 'inversify';
import { iocTypes, SecretVault } from './ioc-types';
import { LoginPageDetector } from './authenticator/login-page-detector';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class UserAgentPlugin extends PuppeteerExtraPlugin {
    public static Name = 'user-agent-plugin';

    private readonly loadCompletedDataKey = 'loadCompleted';

    private secretVault: SecretVault;

    private readonly pluginData: Map<string, any> = new Map();

    constructor(
        @inject(iocTypes.SecretVaultProvider) private readonly secretVaultProvider: () => Promise<SecretVault>,
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,

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
        this.secretVault = await this.secretVaultProvider();

        const userAgentString = await this.getUserAgentString(page);
        const userAgentMetadata = await this.getUserAgentMetadata(page);

        await page.setUserAgent(userAgentString, userAgentMetadata);
    }

    private async getUserAgentString(page: Puppeteer.Page): Promise<string> {
        let userAgent = await page.browser().userAgent();
        userAgent = this.setUserAgentPlatform(userAgent, page);
        // Remove headless chromium flag
        userAgent = userAgent.replace('HeadlessChrome/', 'Chrome/');
        // Add scanner bypass key
        userAgent = `${userAgent} WebInsights/${this.secretVault.webScannerBypassKey}`;

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
        const browserVersion = await page.browser().version();
        const majorVersion = browserVersion.match(/Chrome\/(\d+)\.(.*)/i)[1];
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

    private setUserAgentPlatform(userAgent: string, page: Puppeteer.Page): string {
        // Set to Linux platform to disable authentication fallback to currently logged in Windows user
        const platform = 'X11; Linux x86_64';

        const loginPageType = this.loginPageDetector.getLoginPageType(page);
        if (loginPageType === undefined) {
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
