// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject, optional } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { AuthenticationType } from 'storage-documents';
import { System } from 'common';
import { NavigationResponse, PageOperationResult } from '../page-navigator';
import { PageNavigationTiming, PuppeteerTimeoutConfig } from '../page-timeout-config';
import { PageResponseProcessor } from '../page-response-processor';
import { LoginPageClientFactory } from './login-page-client-factory';

export interface ResourceAuthenticationResult {
    navigationResponse?: NavigationResponse;
    authenticationType?: AuthenticationType;
    authenticated?: boolean;
}

@injectable()
export class ResourceAuthenticator {
    constructor(
        @inject(LoginPageClientFactory) private readonly loginPageClientFactory: LoginPageClientFactory,
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async authenticate(
        url: string,
        authenticationType: AuthenticationType,
        page: Puppeteer.Page,
    ): Promise<ResourceAuthenticationResult> {
        const operationResult = await this.navigatePage(url, page);
        if (operationResult.browserError) {
            return {
                navigationResponse: {
                    httpResponse: operationResult.response,
                    pageNavigationTiming: operationResult.navigationTiming,
                    browserError: operationResult.browserError,
                },
                authenticationType,
                authenticated: false,
            };
        }

        const loginPageClient = this.loginPageClientFactory.getPageClient(authenticationType);
        const navigationResponse = await loginPageClient.login(page);

        const authenticated = navigationResponse.browserError === undefined;
        if (authenticated === true) {
            this.logger.logInfo(`Page was successfully authenticated.`, {
                authenticationType,
                authenticated: `${authenticated}`,
            });
        } else {
            this.logger.logError(`Page authentication has failed.`, {
                authenticationType,
                authenticated: `${authenticated}`,
                error: System.serializeError(navigationResponse.browserError),
            });
        }

        return {
            navigationResponse,
            authenticationType,
            authenticated,
        };
    }

    private async navigatePage(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        const timestamp = System.getTimestamp();
        try {
            this.logger?.logInfo('Navigate page to URL for authentication.');
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec,
            });

            return { response, navigationTiming: { goto: System.getElapsedTime(timestamp) } as PageNavigationTiming };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);
            this.logger?.logError(`Page authenticator navigation error.`, {
                error: System.serializeError(error),
                browserError: System.serializeError(browserError),
            });

            return {
                response: undefined,
                navigationTiming: { goto: System.getElapsedTime(timestamp) } as PageNavigationTiming,
                browserError,
                error,
            };
        }
    }
}
