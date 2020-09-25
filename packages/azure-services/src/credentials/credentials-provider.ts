// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Credentials, MSICredentialsProvider } from './msi-credential-provider';

@injectable()
export class CredentialsProvider {
    constructor(@inject(MSICredentialsProvider) private readonly msiCredentialProvider: MSICredentialsProvider) {}

    public async getCredentialsForKeyVault(): Promise<Credentials> {
        // referred https://azure.microsoft.com/en-us/resources/samples/app-service-msi-keyvault-node/
        return this.getCredentialsForResource('https://vault.azure.net');
    }

    public async getCredentialsForBatch(): Promise<Credentials> {
        // referred https://docs.microsoft.com/en-us/rest/api/batchservice/authenticate-requests-to-the-azure-batch-service#authentication-via-azure-ad
        return this.getCredentialsForResource('https://batch.core.windows.net/');
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msiCredentialProvider.getCredentials(resource);
    }
}
