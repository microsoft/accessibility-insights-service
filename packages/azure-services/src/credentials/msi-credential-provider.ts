// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { RetryHelper, System } from 'common';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';

export type Credentials = msRestNodeAuth.MSITokenCredentials | msRestNodeAuth.ApplicationTokenCredentials;

export enum CredentialType {
    VM,
    AppService,
}

export enum AuthenticationMethod {
    managedIdentity = 'managedIdentity',
    servicePrincipal = 'servicePrincipal',
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

        if (this.authenticationMethod === AuthenticationMethod.servicePrincipal) {
            const clientId = process.env.SP_CLIENT_ID;
            const password = process.env.SP_PASSWORD;
            const tenant = process.env.SP_TENANT;

            getCredentialsFunction = async () =>
                this.msrestAzureObj.loginWithServicePrincipalSecret(clientId, password, tenant, { tokenAudience: resource });
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
            throw new Error(`MSI getToken failed ${this.maxAttempts} times with error: ${System.serializeError(error)}`);
        }
    }
}
