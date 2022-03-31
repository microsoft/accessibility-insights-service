// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential, ChainedTokenCredential, EnvironmentCredential } from '@azure/identity';
import { inject, injectable } from 'inversify';
import { Credentials, MSICredentialsProvider } from './msi-credential-provider';
import { AzureManagedCredential } from './azure-managed-credential';

@injectable()
export class CredentialsProvider {
    private chainedTokenCredential: ChainedTokenCredential;

    constructor(@inject(MSICredentialsProvider) private readonly msiCredentialProvider: MSICredentialsProvider) {}

    public async getCredentialsForBatch(): Promise<Credentials> {
        // eslint-disable-next-line max-len
        // referred https://docs.microsoft.com/en-us/rest/api/batchservice/authenticate-requests-to-the-azure-batch-service#authentication-via-azure-ad
        return this.getCredentialsForResource('https://batch.core.windows.net/');
    }

    public getAzureCredential(): TokenCredential {
        if (!this.chainedTokenCredential) {
            // The following credential providers will be tried, in order:
            // - AzureManagedCredential
            // - EnvironmentCredential
            this.chainedTokenCredential = new ChainedTokenCredential(new AzureManagedCredential(), new EnvironmentCredential());
        }

        return this.chainedTokenCredential;
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msiCredentialProvider.getCredentials(resource);
    }
}
