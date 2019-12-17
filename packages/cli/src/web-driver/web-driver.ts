// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            headless: true,
            timeout: 30000,
            args: ['--disable-dev-shm-usage'],
        });

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
        }
    }
}
