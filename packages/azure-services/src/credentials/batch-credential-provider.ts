// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as msRest from '@azure/ms-rest-js';
import { executeWithExponentialRetry, System } from 'common';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';

@injectable()
export class BatchCredentialProvider {
    private readonly resource = 'https://batch.core.windows.net/';

    public constructor(@inject(iocTypeNames.msRestAzure) private readonly msRestAzureObj: typeof msRestNodeAuth) {}

    public async getCredential(): Promise<msRest.ServiceClientCredentials> {
        return executeWithExponentialRetry(async () => {
            let credentials;
            try {
                credentials = await this.msRestAzureObj.loginWithVmMSI({ resource: this.resource, clientId: process.env.AZURE_CLIENT_ID });
            } catch (error) {
                throw new Error(`The @azure/ms-rest-nodeauth credentials provider has failed. ${System.serializeError(error)}`);
            }

            return credentials;
        });
    }
}
