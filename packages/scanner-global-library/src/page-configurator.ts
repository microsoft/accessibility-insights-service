// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class PageConfigurator {
    public async configurePage(page: Puppeteer.Page): Promise<void> {
        await page.setBypassCSP(true);
        await this.enablePageResizing(page);
    }

    private async enablePageResizing(page: Puppeteer.Page): Promise<void> {
        // enable page resizing to match to browser viewport
        const client = await page.target().createCDPSession();
        await client.send('Emulation.clearDeviceMetricsOverride');
    }
}
