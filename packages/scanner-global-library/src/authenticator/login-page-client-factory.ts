// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { LoginPageType } from './login-page-detector';
import { AzureLoginPageClient, LoginPageClient } from './azure-login-page-client';

@injectable()
export class LoginPageClientFactory {
    constructor(@inject(AzureLoginPageClient) private readonly azureLoginPageClient: AzureLoginPageClient) {}

    public getPageClient(loginPageType: LoginPageType): LoginPageClient {
        switch (loginPageType) {
            case 'MicrosoftAzure':
                return this.azureLoginPageClient;
            default:
                throw new Error(`Login page type ${loginPageType} is not supported.`);
        }
    }
}
