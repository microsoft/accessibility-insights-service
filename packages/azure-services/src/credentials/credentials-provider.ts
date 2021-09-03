// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential, TokenCredential } from '@azure/identity';
import { inject, injectable } from 'inversify';
import { Credentials, MSICredentialsProvider } from './msi-credential-provider';

@injectable()
export class CredentialsProvider {
    private defaultCredential: DefaultAzureCredential;

    constructor(@inject(MSICredentialsProvider) private readonly msiCredentialProvider: MSICredentialsProvider) {}

    public async getCredentialsForBatch(): Promise<Credentials> {
        // eslint-disable-next-line max-len
        // referred https://docs.microsoft.com/en-us/rest/api/batchservice/authenticate-requests-to-the-azure-batch-service#authentication-via-azure-ad
        return this.getCredentialsForResource('https://batch.core.windows.net/');
    }

    public getDefaultAzureCredential(): TokenCredential {
        if (!this.defaultCredential) {
            this.defaultCredential = new DefaultAzureCredential();
        }

        return this.defaultCredential;
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msiCredentialProvider.getCredentials(resource);
    }
}
