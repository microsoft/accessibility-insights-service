// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TokenCredential } from '@azure/identity';
import { inject, injectable, optional } from 'inversify';
import * as msRest from '@azure/ms-rest-js';
import { BatchCredentialProvider } from './batch-credential-provider';
import { IdentityCredentialProvider } from './identity-credential-provider';

export type Credentials = msRest.ServiceClientCredentials;

@injectable()
export class CredentialsProvider {
    constructor(
        @optional() @inject('BatchCredentialProvider') private readonly batchCredentialProvider: BatchCredentialProvider,
        @optional() @inject('IdentityCredentialProvider') private readonly identityCredentialProvider: IdentityCredentialProvider,
    ) {}

    public async getBatchCredential(): Promise<Credentials> {
        return this.batchCredentialProvider.getCredential();
    }

    public getAzureCredential(): TokenCredential {
        return this.identityCredentialProvider;
    }
}
