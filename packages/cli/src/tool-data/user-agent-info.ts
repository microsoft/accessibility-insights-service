// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import Puppeteer from 'puppeteer';

@injectable()
export class UserAgentInfo {
    constructor(private readonly puppeteer: typeof Puppeteer = Puppeteer) {}

    public async getInfo(): Promise<string> {
        const browser = await this.puppeteer.launch({ args: ['--disable-dev-shm-usage'] });

        // tslint:disable-next-line:no-unnecessary-local-variable
        const userAgent = await browser.userAgent();

        await browser.close();

        return userAgent;
    }
}
