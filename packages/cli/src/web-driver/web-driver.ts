// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;
    public userAgent: string;

    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(chromePath?: string): Promise<Puppeteer.Browser> {
        this.browser = await this.puppeteer.launch({
            headless: true,
            executablePath: chromePath,
            args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        });
        // convert to headful user agent to prevent web site from blocking an access
        this.userAgent = (await this.browser.userAgent()).replace('HeadlessChrome', 'Chrome');

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
        }
    }
}
