// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AuthenticationMethod } from './authentication-method';

export class AzurePortalAuthentication implements AuthenticationMethod {
    constructor(private readonly accountName: string, private readonly accountPassword: string) {}

    public async authenticate(page: Puppeteer.Page, attemptNumber: number = 1): Promise<void> {
        await page.goto('https://portal.azure.com');
        await page.waitForSelector('input[name="loginfmt"]');
        await page.type('input[name="loginfmt"]', this.accountName);
        await page.keyboard.press('Enter');
        await page.waitForSelector('#FormsAuthentication');
        await page.click('#FormsAuthentication');
        await page.type('input[type="password"]', this.accountPassword);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        if (!page.url().match('^https://ms.portal.azure.com')) {
            if (attemptNumber > 4) {
                console.error(`Attempted authentication ${attemptNumber} times and ultimately failed.`);

                return;
            }
            const errorText: string = await page.$eval('#errorText', (el) => el.textContent);
            if (!isEmpty(errorText)) {
                console.warn(`Authentication failed with error: ${errorText}`);
            }
            await this.authenticate(page, attemptNumber + 1);

            return;
        }
        console.info('Authentication succeeded');
    }
}
