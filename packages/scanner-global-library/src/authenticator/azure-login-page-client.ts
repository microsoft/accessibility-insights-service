// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { inject, optional, injectable } from 'inversify';
import { PageNavigator, NavigationResponse } from '../page-navigator';
import { ServicePrincipalCredentialProvider } from './service-principal-credential-provider';

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
        @inject(ServicePrincipalCredentialProvider)
        @optional()
        private readonly servicePrincipalCredentialProvider: ServicePrincipalCredentialProvider = new ServicePrincipalCredentialProvider(),
    ) {}

    public async login(page: Puppeteer.Page): Promise<NavigationResponse> {
        const azureAuthClientCredential = await this.servicePrincipalCredentialProvider.getAzureAuthClientCredential();

        // Enter account name
        try {
            await page.waitForSelector('input[name="loginfmt"]', { timeout: this.selectorTimeoutMsec });
            await page.type('input[name="loginfmt"]', azureAuthClientCredential.name);
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
        if (navigationResponse.browserError !== undefined) {
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
            await page.type('input[type="password"]', azureAuthClientCredential.password);
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
        if (navigationResponse.browserError !== undefined) {
            return this.getErrorResponse(navigationResponse, page, '#errorTextOption');
        }

        // Validate multi-factor authentication prompt
        const smartcardPrompt = await this.getElementContent('#CertificateAuthentication', page);
        const phonePrompt = await this.getElementContent('#WindowsAzureMultiFactorAuthentication', page);
        if (smartcardPrompt !== undefined || phonePrompt !== undefined) {
            const message = 'Multi-factor authentication user prompt is detected.';

            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message,
                    stack: new Error(message).stack,
                },
            };
        }

        // Enable Keep Me Signed In (KMSI) if prompted
        // eslint-disable-next-line max-len
        // https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-users-profile-azure-portal#learn-about-the-stay-signed-in-prompt
        try {
            const acceptPrompt = await this.getElementContent('#idSIButton9', page);
            if (acceptPrompt !== undefined) {
                await Promise.all([this.pageNavigator.waitForNavigation(page), page.keyboard.press('Enter')]);
            }
        } catch (error) {
            if (error.name !== 'TimeoutError') {
                return {
                    browserError: {
                        errorType: 'AuthenticationError',
                        message: error.message,
                        stack: error.stack,
                    },
                };
            }
        }

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
}
