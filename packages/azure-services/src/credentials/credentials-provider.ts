// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential, AzureCliCredential } from '@azure/identity';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';
import { Credentials, MSICredentialsProvider, AuthenticationMethod } from './msi-credential-provider';
import { ManagedIdentityCredential } from './managed-identity-credential';

@injectable()
export class CredentialsProvider {
    constructor(
        @inject(MSICredentialsProvider) private readonly msiCredentialProvider: MSICredentialsProvider,
        @inject(ManagedIdentityCredential) private readonly managedIdentityCredential: ManagedIdentityCredential,
        @inject(iocTypeNames.AuthenticationMethod) private readonly authenticationMethod: AuthenticationMethod,
    ) {}

    public async getCredentialsForBatch(): Promise<Credentials> {
        return this.getCredentialsForResource('https://batch.core.windows.net/');
    }

    public getAzureCredential(): TokenCredential {
        if (this.authenticationMethod === AuthenticationMethod.azureCliCredentials) {
            return new AzureCliCredential();
        } else {
            // must be object instance to reuse an internal cache
            return this.managedIdentityCredential;
        }
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msiCredentialProvider.getCredentials(resource);
    }
}
