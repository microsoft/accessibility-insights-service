// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { AuthenticationType } from 'storage-documents';
import { AzureLoginPageClient, LoginPageClient } from './azure-login-page-client';

@injectable()
export class LoginPageClientFactory {
    constructor(@inject(AzureLoginPageClient) private readonly azureLoginPageClient: AzureLoginPageClient) {}

    public getPageClient(authenticationType: AuthenticationType): LoginPageClient {
        switch (authenticationType) {
            case 'entraId':
                return this.azureLoginPageClient;
            case 'undetermined':
            default:
                return undefined;
        }
    }
}
