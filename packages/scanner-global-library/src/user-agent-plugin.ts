// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin, PluginOptions } from 'puppeteer-extra-plugin';
import Puppeteer from 'puppeteer';

export class UserAgentPlugin extends PuppeteerExtraPlugin {
    constructor(opts?: PluginOptions) {
        super(opts);
    }

    public get name(): string {
        return 'user-agent-plugin';
    }

    /**
     * Overrides platform part of the user agent string
     */
    public async onPageCreated(page: Puppeteer.Page): Promise<void> {
        const platform = 'X11; Linux x86_64';

        let userAgent = await page.browser().userAgent();
        userAgent = userAgent.replace(/(.*)(Windows[^)]*)(.*)/i, `$1${platform}$3`);

        await page.setUserAgent(userAgent);
    }
}
