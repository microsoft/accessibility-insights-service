// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { inject, optional } from 'inversify';
import { ServicePrincipalProvider } from './service-principal-provider';

export class AzureLoginClient {
    private readonly selectorTimeoutMsec = 3000;

    constructor(
        @inject(ServicePrincipalProvider)
        @optional()
        private readonly servicePrincipalProvider: ServicePrincipalProvider = new ServicePrincipalProvider(),
    ) {}

    public async login(page: Puppeteer.Page): Promise<void> {
        const servicePrincipal = this.servicePrincipalProvider.getDefaultServicePrincipal();

        await page.waitForSelector('input[name="loginfmt"]', { timeout: this.selectorTimeoutMsec });
        await page.type('input[name="loginfmt"]', servicePrincipal.name);
        try {
            await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
        } catch (error) {
            const errorText: string = await page.$eval('#usernameError', (el) => el.textContent).catch(() => '');
            throw new Error(isEmpty(errorText) ? error : `Authentication failed with error: ${errorText}`);
        }

        try {
            await page.waitForSelector('#FormsAuthentication', { timeout: this.selectorTimeoutMsec });
        } catch (error) {
            throw new Error(
                `Authentication failed. Authentication requires a non-people service account. To learn how to set up a service account, visit: https://aka.ms/AI-action-auth. ${error}`,
            );
        }

        await page.click('#FormsAuthentication');
        await page.type('input[type="password"]', servicePrincipal.password);
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);

        await this.handleKmsiPageIfShown(page);

        // if (!this.authenticationSucceeded(page)) {
        //     const errorText: string = await page.$eval('#errorText', (el) => el.textContent).catch(() => '');
        //     throw new Error(`Authentication failed${isEmpty(errorText) ? '' : ` with error: ${errorText}`}`);
        // }
    }

    private async handleKmsiPageIfShown(page: Puppeteer.Page): Promise<void> {
        try {
            await page.waitForSelector('#idBtn_Back', { timeout: this.selectorTimeoutMsec });
            await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#idBtn_Back')]);
            console.info('KMSI page handled.');
        } catch (error) {
            console.info('KMSI page not shown.');
        }
    }
}
