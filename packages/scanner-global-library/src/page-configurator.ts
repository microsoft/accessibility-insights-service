// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { defaultBrowserOptions } from './puppeteer-options';

@injectable()
export class PageConfigurator {
    private readonly userAgent: string;

    public getUserAgent(): string {
        return this.userAgent;
    }

    public async configurePage(page: Puppeteer.Page): Promise<void> {
        await page.setViewport(defaultBrowserOptions.defaultViewport);
        await page.setBypassCSP(true);
        await this.enablePageResizing(page);
    }

    public getBrowserResolution(): string {
        return `${defaultBrowserOptions.defaultViewport.width}x${defaultBrowserOptions.defaultViewport.height}`;
    }

    private async enablePageResizing(page: Puppeteer.Page): Promise<void> {
        // enable page resizing to match to browser viewport
        //@ts-expect-error
        await page._client.send('Emulation.clearDeviceMetricsOverride');
    }
}
