// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Browser } from 'puppeteer';
import { WebDriver } from 'service-library';

@injectable()
export class WebDriverTask {
    private readonly webDriver: WebDriver;

    constructor(@inject(WebDriver) webDriver: WebDriver) {
        this.webDriver = webDriver;
    }

    public async launch(): Promise<Browser> {
        return this.webDriver.launch();
    }

    public async close(): Promise<void> {
        await this.webDriver.close();
    }
}
