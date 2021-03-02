// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { WebDriver } from 'scanner-global-library';
import Puppeteer from 'puppeteer';

@injectable()
export class BrowserLauncher {
    private readonly browsers = new Map<Puppeteer.Browser, Date>();

    constructor(@inject(WebDriver) private readonly webDriver: WebDriver) {}

    public async launch(browserExecutablePath?: string): Promise<Puppeteer.Browser> {
        const browser = await this.webDriver.launch(browserExecutablePath);
        this.browsers.set(browser, new Date());

        return browser;
    }

    public async closeAll(): Promise<void> {
        for (const b of this.browsers.keys()) {
            await b.close();
        }
    }
}
