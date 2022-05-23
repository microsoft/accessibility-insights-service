// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { AuthenticationMethod } from './authentication-method';

export class Authenticator {
    public constructor(protected authenticationMethod: AuthenticationMethod) {}

    public async run(browser: Puppeteer.Browser): Promise<void> {
        const page = await browser.newPage();
        await this.authenticationMethod.authenticate(page);
        await page.close();
    }
}
