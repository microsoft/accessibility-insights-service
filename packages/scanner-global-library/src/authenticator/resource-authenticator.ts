// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject, optional } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { NavigationResponse } from '../page-navigator';
import { LoginPageDetector, LoginPageType } from './login-page-detector';
import { LoginPageClientFactory } from './login-page-client-factory';

export interface ResourceAuthenticationResult {
    navigationResponse?: NavigationResponse;
    loginPageType?: LoginPageType;
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
        const loginPageType = this.loginPageDetector.getLoginPageType(page);
        if (loginPageType === undefined) {
            return undefined;
        }

        this.logger.logInfo(`Detected ${loginPageType} login page type.`, { loginPageType });
        const loginPageClient = this.loginPageClientFactory.getPageClient(loginPageType);

        const navigationResponse = await loginPageClient.login(page);
        const authenticated = navigationResponse.browserError === undefined;

        return {
            navigationResponse,
            loginPageType,
            authenticated,
        };
    }
}
