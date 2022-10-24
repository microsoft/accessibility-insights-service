// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AuthenticationMethod } from './authentication-method';

export class AzureActiveDirectoryAuthentication implements AuthenticationMethod {
    constructor(private readonly accountName: string, private readonly accountPassword: string) {}

    public async authenticate(page: Puppeteer.Page, attemptNumber: number = 1): Promise<void> {
        await page.goto('https://portal.azure.com');

        if (this.authenticationSucceeded(page)) {
            return;
        }

        await page.waitForSelector('input[name="loginfmt"]');
        await page.type('input[name="loginfmt"]', this.accountName);
        try {
            await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
        } catch (error) {
            const errorText: string = await page.$eval('#usernameError', (el) => el.textContent).catch(() => '');
            throw new Error(isEmpty(errorText) ? error : `Authentication failed with error: ${errorText}`);
        }
        await page.waitForSelector('#FormsAuthentication');
        await page.click('#FormsAuthentication');
        await page.type('input[type="password"]', this.accountPassword);
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), await page.keyboard.press('Enter')]);
        if (!this.authenticationSucceeded(page)) {
            if (attemptNumber > 4) {
                console.error(`Attempted authentication ${attemptNumber} times and ultimately failed.`);

                return;
            }

            const errorText: string = await page.$eval('#errorText', (el) => el.textContent).catch(() => '');
            if (!isEmpty(errorText)) {
                console.error(`Authentication failed with error: ${errorText}`);
            }
            await this.authenticate(page, attemptNumber + 1);

            return;
        }
    }

    private authenticationSucceeded(page: Puppeteer.Page): boolean {
        const currentUrl = page.url();
        if (!currentUrl.match('^https://ms.portal.azure.com')) {
            return false;
        }
        console.info('Authentication succeeded.');

        return true;
    }
}
