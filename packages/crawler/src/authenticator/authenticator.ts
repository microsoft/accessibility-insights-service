// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import * as Puppeteer from 'puppeteer';
import { AuthenticationStep, AuthenticationFlow } from './authentication-flow';

export class Authenticator {
    public constructor(protected authenticationFlow: AuthenticationFlow, private logger: typeof Apify.utils.log = Apify.utils.log) {}

    public async run(browser: Puppeteer.Browser): Promise<void> {
        const page = await browser.newPage();
        await this.attemptAuthentication(page);
        await page.close();
    }

    private async executeAuthenticationStep(page: Puppeteer.Page, step: AuthenticationStep): Promise<void> {
        switch (step.operation) {
            case 'click':
                await page.waitForSelector(step.selector);
                await page.click(step.selector);
                break;
            case 'type':
                await page.waitForSelector(step.selector);
                await page.type(step.selector, step.value);
                break;
            case 'enter':
                await page.keyboard.press('Enter');
                break;
            case 'waitForNavigation':
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                break;
            default:
                throw new Error(`${step.operation} is not a valid authentication step operation`);
        }
    }

    private async attemptAuthentication(page: Puppeteer.Page, attemptNumber: number = 1): Promise<void> {
        await page.goto(this.authenticationFlow.startingUrl);
        for (let step of this.authenticationFlow.steps) {
            await this.executeAuthenticationStep(page, step);
        }

        if (!this.checkAuthenticationSucceeded(page, this.authenticationFlow.authenticatedUrl)) {
            const errorText: string = await page.$eval('#errorText', (el) => el.textContent);
            if (attemptNumber > 4) {
                this.logger.error(`Attempted authentication ${attemptNumber} times and ultimately failed.`);

                return;
            }
            if (errorText !== '') {
                this.logger.warning(`Authentication failed with error: ${errorText}`);
            }
            await this.attemptAuthentication(page, attemptNumber + 1);

            return;
        }
        this.logger.info('Authentication succeeded');
    }

    private checkAuthenticationSucceeded(page: Puppeteer.Page, url: string): boolean {
        return page.url().match(`^${url}`) != null;
    }
}
