// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { inject, optional, injectable } from 'inversify';
import { AuthenticationType } from 'storage-documents';
import { GlobalLogger } from 'logger';
import { PageNavigator, NavigationResponse } from '../page-navigator';
import { BrowserError } from '../browser-error';
import { ServicePrincipalCredentialProvider } from './service-principal-credential-provider';

export interface LoginPageClient {
    authenticationType: AuthenticationType;
    login(page: Puppeteer.Page): Promise<NavigationResponse>;
}

export declare type AuthenticationSteps = 'account' | 'password' | 'authenticationOptions' | 'permissions' | 'kmsi';

/**
 * The Microsoft Azure Login page https://login.microsoftonline.com/ automation client.
 */
@injectable()
export class AzureLoginPageClient implements LoginPageClient {
    public readonly authenticationType = 'entraId';

    private readonly selectorTimeoutMsec = 5000;

    constructor(
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(ServicePrincipalCredentialProvider)
        @optional()
        private readonly servicePrincipalCredentialProvider: ServicePrincipalCredentialProvider = new ServicePrincipalCredentialProvider(),
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async login(page: Puppeteer.Page): Promise<NavigationResponse> {
        const azureAuthClientCredential = await this.servicePrincipalCredentialProvider.getAzureAuthClientCredential();

        // Enter account name
        try {
            await page.waitForSelector('input[name="loginfmt"]', { timeout: this.selectorTimeoutMsec });
            await page.type('input[name="loginfmt"]', azureAuthClientCredential.name);
            this.logger?.logInfo('The account name has been entered into the login form.');
        } catch (error) {
            return { browserError: this.getFormError('account', error) };
        }

        // Submit account form
        let responses = await Promise.all([this.pageNavigator.waitForNavigation(page), page.keyboard.press('Enter')]);
        let navigationResponse = responses[0];
        if (navigationResponse.browserError !== undefined) {
            return this.getErrorResponse(navigationResponse, page, '#usernameError');
        }
        this.logger?.logInfo('The login form with the account name has been submitted.');

        // Select optional 'Password' authentication option
        try {
            await page.waitForSelector('#FormsAuthentication', { timeout: this.selectorTimeoutMsec });
            await page.click('#FormsAuthentication');
            this.logger?.logInfo('The option for password authentication has been selected.');
        } catch (error) {
            const formError = this.getFormError('authenticationOptions', error);
            if (formError) {
                return { browserError: formError };
            }
        }

        // Enter account password
        try {
            await page.waitForSelector('input[type="password"]', { timeout: this.selectorTimeoutMsec });
            await page.type('input[type="password"]', azureAuthClientCredential.password);
            this.logger?.logInfo('The account password has been entered into the login form.');
        } catch (error) {
            return { browserError: this.getFormError('password', error) };
        }

        // Submit password form
        await page.keyboard.press('Enter');
        this.logger?.logInfo('The login form with the account password has been submitted.');

        // Validate for  multi-factor authentication prompt
        const smartcardPrompt = await this.getElementContent('#CertificateAuthentication', page);
        const phonePrompt = await this.getElementContent('#WindowsAzureMultiFactorAuthentication', page);
        if (smartcardPrompt !== undefined || phonePrompt !== undefined) {
            const message = 'Unsupported multi-factor authentication user prompt has been detected.';

            return {
                browserError: {
                    errorType: 'AuthenticationError',
                    message,
                    stack: new Error(message).stack,
                },
            };
        }

        // Accept permissions request
        try {
            await page.waitForSelector('input[name="idSIButton9"]', { timeout: this.selectorTimeoutMsec });
            responses = await Promise.all([this.pageNavigator.waitForNavigation(page), page.click('input[name="idSIButton9"]')]);
            navigationResponse = responses[0];
            this.logger?.logInfo('The permissions request has been accepted.');
        } catch (error) {
            const formError = this.getFormError('permissions', error);
            if (formError) {
                return { browserError: formError };
            }
        }

        // Enable Keep Me Signed In (KMSI) option
        try {
            await page.waitForSelector('#idSIButton9', { timeout: this.selectorTimeoutMsec });
            responses = await Promise.all([this.pageNavigator.waitForNavigation(page), page.keyboard.press('Enter')]);
            navigationResponse = responses[0];
            this.logger?.logInfo('The KMSI option has been accepted.');
        } catch (error) {
            const formError = this.getFormError('kmsi', error);
            if (formError) {
                return { browserError: formError };
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
        return page
            .$eval(errorMessageSelector, (div) => div.textContent)
            .catch((): string => {
                return undefined;
            });
    }

    private getFormError(step: AuthenticationSteps, error: Puppeteer.PuppeteerError): BrowserError {
        // Skip mandatory steps
        if (!['account', 'password'].includes(step) && error?.name === 'TimeoutError') {
            return undefined;
        }

        return {
            errorType: 'AuthenticationError',
            message: `Error at ${step} authentication step. ${error.message}`,
            stack: error.stack,
        };
    }
}
