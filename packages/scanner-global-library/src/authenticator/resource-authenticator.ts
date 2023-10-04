// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject, optional } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { AuthenticationType } from 'storage-documents';
import { System } from 'common';
import { NavigationResponse } from '../page-navigator';
import { LoginPageDetector } from './login-page-detector';
import { LoginPageClientFactory } from './login-page-client-factory';

export interface ResourceAuthenticationResult {
    navigationResponse?: NavigationResponse;
    authenticationType?: AuthenticationType;
    authenticated?: boolean;
}

@injectable()
export class ResourceAuthenticator {
    constructor(
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,
        @inject(LoginPageClientFactory) private readonly loginPageClientFactory: LoginPageClientFactory,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async authenticate(page: Puppeteer.Page): Promise<ResourceAuthenticationResult> {
        const authenticationType = this.loginPageDetector.getAuthenticationType(page.url());
        if (authenticationType === undefined || authenticationType === 'unknown') {
            return undefined;
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
}
