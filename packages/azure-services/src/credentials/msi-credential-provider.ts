// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as msRest from '@azure/ms-rest-js';
import { executeWithExponentialRetry, System } from 'common';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';

export type Credentials = msRestNodeAuth.MSITokenCredentials | msRestNodeAuth.ApplicationTokenCredentials | msRest.ServiceClientCredentials;

export enum CredentialType {
    VM,
    AppService,
}

export enum AuthenticationMethod {
    managedIdentity = 'managedIdentity',
    azureCliCredentials = 'azureCliCredentials',
}

@injectable()
export class MSICredentialsProvider {
    public constructor(
        @inject(iocTypeNames.msRestAzure) private readonly msRestAzureObj: typeof msRestNodeAuth,
        @inject(iocTypeNames.AuthenticationMethod) private readonly authenticationMethod: AuthenticationMethod,
        @inject(iocTypeNames.CredentialType) private readonly credentialType: CredentialType,
    ) {}

    public async getCredentials(resource: string): Promise<Credentials> {
        let getCredentialsFunction: () => Promise<Credentials>;

        if (this.authenticationMethod === AuthenticationMethod.azureCliCredentials) {
            getCredentialsFunction = async () => this.msRestAzureObj.AzureCliCredentials.create({ resource });
        } else if (this.credentialType === CredentialType.VM) {
            getCredentialsFunction = async () => this.msRestAzureObj.loginWithVmMSI({ resource });
        } else {
            getCredentialsFunction = async () => this.msRestAzureObj.loginWithAppServiceMSI({ resource });
        }

        return executeWithExponentialRetry(async () => {
            let credentials;
            try {
                credentials = await getCredentialsFunction();
            } catch (error) {
                throw new Error(`The MSICredentialsProvider provider has failed. ${System.serializeError(error)}`);
            }

            return credentials;
        });
    }
}
