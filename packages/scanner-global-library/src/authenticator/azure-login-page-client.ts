// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { inject, optional, injectable } from 'inversify';
import { Url } from 'common';
import { PageNavigator, NavigationResponse } from '../page-navigator';
import { ServicePrincipalProvider } from './service-principal-provider';

export interface LoginPageClient {
    login(page: Puppeteer.Page): Promise<NavigationResponse>;
}

/**
 * The Microsoft Azure Login page https://login.microsoftonline.com/ automation client.
 */
@injectable()
export class AzureLoginPageClient implements LoginPageClient {
    private readonly selectorTimeoutMsec = 10000;

    constructor(
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(ServicePrincipalProvider)
        @optional()
        private readonly servicePrincipalProvider: ServicePrincipalProvider = new ServicePrincipalProvider(),
    ) {}

    public async login(page: Puppeteer.Page): Promise<NavigationResponse> {
        const servicePrincipal = this.servicePrincipalProvider.getDefaultServicePrincipal();

        const redirectUrl = Url.getParameterValue('redirect_uri', page.url());
        console.log(redirectUrl);

        // Enter account name
        try {
            await page.waitForSelector('input[name="loginfmt"]', { timeout: this.selectorTimeoutMsec });
            await page.type('input[name="loginfmt"]', servicePrincipal.name);
        } catch (error) {
            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message: error.name === 'TimeoutError' ? 'Failed to detect account input prompt on a login page.' : error.message,
                    stack: error.stack,
                },
            };
        }

        // Click Next button
        let responses = await Promise.all([this.pageNavigator.waitForNavigation(page), page.keyboard.press('Enter')]);
        let navigationResponse = responses[0];
        if (navigationResponse.browserError) {
            return this.getErrorResponse(navigationResponse, page, '#usernameError');
        }

        // Select Password authentication option
        try {
            await page.waitForSelector('#FormsAuthentication', { timeout: this.selectorTimeoutMsec });
            await page.click('#FormsAuthentication');
        } catch (error) {
            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message: error.name === 'TimeoutError' ? 'Password authentication option is not presented.' : error.message,
                    stack: error.stack,
                },
            };
        }

        // Enter account password
        try {
            await page.waitForSelector('input[type="password"]', { timeout: this.selectorTimeoutMsec });
            await page.type('input[type="password"]', servicePrincipal.password);
        } catch (error) {
            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message: error.name === 'TimeoutError' ? 'Failed to detect password input prompt on a login page.' : error.message,
                    stack: error.stack,
                },
            };
        }

        // Submit account credentials for authentication
        responses = await Promise.all([this.pageNavigator.waitForNavigation(page), page.keyboard.press('Enter')]);
        navigationResponse = responses[0];
        if (navigationResponse.browserError) {
            return this.getErrorResponse(navigationResponse, page, '#errorTextOption');
        }

        // Validate multi-factor authentication prompt
        const smartcardPrompt = await this.getElementContent('#CertificateAuthentication', page);
        const phonePrompt = await this.getElementContent('#WindowsAzureMultiFactorAuthentication', page);
        if (smartcardPrompt || phonePrompt) {
            const message = 'Multi-factor authentication user prompt is detected.';

            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message,
                    stack: new Error(message).stack,
                },
            };
        }

        // todo add target redirect validation

        await this.handleKmsiPageIfShown(page);

        // if (!this.authenticationSucceeded(page)) {
        //     const errorText: string = await page.$eval('#errorText', (el) => el.textContent).catch(() => '');
        //     throw new Error(`Authentication failed${isEmpty(errorText) ? '' : ` with error: ${errorText}`}`);
        // }

        return navigationResponse;
    }

    private async getErrorResponse(
        navigationResponse: NavigationResponse,
        page: Puppeteer.Page,
        errorMessageSelector?: string,
    ): Promise<NavigationResponse> {
        navigationResponse.httpResponse = undefined;
        navigationResponse.browserError = {
            ...navigationResponse.browserError,
            errorType: 'AuthenticationError',
            message: (await this.getElementContent(errorMessageSelector, page)) ?? navigationResponse.browserError.message,
        };

        return navigationResponse;
    }

    private async getElementContent(errorMessageSelector: string, page: Puppeteer.Page): Promise<string> {
        return page.$eval(errorMessageSelector, (div) => div.textContent).catch(() => undefined);
    }

    // Keep Me Signed In (KMSI)
    // eslint-disable-next-line max-len
    // https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-users-profile-azure-portal#learn-about-the-stay-signed-in-prompt
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
