// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class WebDriver {
    public browser: Puppeteer.Browser;

    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async launch(chromePath?: string): Promise<Puppeteer.Browser> {
        let launchOption: Puppeteer.LaunchOptions;
        launchOption = {
            headless: true,
            timeout: 30000,
            args: ['--disable-dev-shm-usage'],
        };

        if (chromePath !== undefined) {
            launchOption.executablePath = chromePath;
        }

        this.browser = await this.puppeteer.launch(launchOption);

        return this.browser;
    }

    public async close(): Promise<void> {
        if (this.browser !== undefined) {
            await this.browser.close();
        }
    }
}
