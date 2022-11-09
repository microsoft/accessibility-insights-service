// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AuthenticationMethod } from './authentication-method';

export class AzureActiveDirectoryAuthentication implements AuthenticationMethod {
    constructor(private readonly accountName: string, private readonly accountPassword: string) {}

    public async authenticate(page: Puppeteer.Page): Promise<void> {
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

        try {
            await page.waitForSelector('#FormsAuthentication');
        } catch (error) {
            throw new Error(
                `Authentication failed. Authentication requires a non-people service account. To learn how to set up a service account, visit: https://aka.ms/AI-action-auth. ${error}`,
            );
        }

        await page.click('#FormsAuthentication');
        await page.type('input[type="password"]', this.accountPassword);
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);

        await this.handleKmsiPageIfShown(page);

        if (!this.authenticationSucceeded(page)) {
            const errorText: string = await page.$eval('#errorText', (el) => el.textContent).catch(() => '');
            throw new Error(`Authentication failed${isEmpty(errorText) ? '' : ` with error: ${errorText}`}`);
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

    private async handleKmsiPageIfShown(page: Puppeteer.Page): Promise<void> {
        try {
            await page.waitForSelector('#idBtn_Back', { timeout: 5000 });
            await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#idBtn_Back')]);
            console.info('KMSI page handled.');
        } catch (error) {
            console.info('KMSI page not shown.');
        }
    }
}
