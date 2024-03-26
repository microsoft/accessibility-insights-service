// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as msRest from '@azure/ms-rest-js';
import { RetryHelper, System } from 'common';
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
        @inject(iocTypeNames.msRestAzure) private readonly msrestAzureObj: typeof msRestNodeAuth,
        @inject(iocTypeNames.AuthenticationMethod) private readonly authenticationMethod: AuthenticationMethod,
        @inject(iocTypeNames.CredentialType) private readonly credentialType: CredentialType,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<Credentials>,
        private readonly maxAttempts: number = 3,
        private readonly msBetweenRetries: number = 1000,
    ) {}

    public async getCredentials(resource: string): Promise<Credentials> {
        let getCredentialsFunction: () => Promise<Credentials>;

        if (this.authenticationMethod === AuthenticationMethod.azureCliCredentials) {
            getCredentialsFunction = async () => this.msrestAzureObj.AzureCliCredentials.create({ resource });
        } else if (this.credentialType === CredentialType.VM) {
            getCredentialsFunction = async () => this.msrestAzureObj.loginWithVmMSI({ resource });
        } else {
            getCredentialsFunction = async () => this.msrestAzureObj.loginWithAppServiceMSI({ resource });
        }

        try {
            return this.retryHelper.executeWithRetries(
                getCredentialsFunction,
                async (error: Error) => {
                    return;
                },
                this.maxAttempts,
                this.msBetweenRetries,
            );
        } catch (error) {
            throw new Error(`MSI getToken() failed ${this.maxAttempts} times with error: ${System.serializeError(error)}`);
        }
    }
}
