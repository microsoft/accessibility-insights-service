// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';

export type Credentials = msRestNodeAuth.MSIVmTokenCredentials | msRestNodeAuth.ApplicationTokenCredentials;

export enum AuthenticationMethod {
    managedIdentity = 'managedIdentity',
    servicePrincipal = 'servicePrincipal',
}

@injectable()
export class CredentialsProvider {
    constructor(
        @inject(iocTypeNames.msRestAzure) private readonly msrestAzureObj: typeof msRestNodeAuth,
        @inject(iocTypeNames.AuthenticationMethod) private readonly authenticationMethod: AuthenticationMethod,
    ) {}

    public async getCredentialsForKeyVault(): Promise<Credentials> {
        // referred https://azure.microsoft.com/en-us/resources/samples/app-service-msi-keyvault-node/
        return this.getCredentialsForResource('https://vault.azure.net');
    }

    public async getCredentialsForBatch(): Promise<Credentials> {
        // tslint:disable-next-line: max-line-length
        // referred https://docs.microsoft.com/en-us/rest/api/batchservice/authenticate-requests-to-the-azure-batch-service#authentication-via-azure-ad
        return this.getCredentialsForResource('https://batch.core.windows.net/');
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        if (this.authenticationMethod === AuthenticationMethod.managedIdentity) {
            return this.msrestAzureObj.loginWithVmMSI({ resource });
        }

        if (this.authenticationMethod === AuthenticationMethod.servicePrincipal) {
            const clientId = process.env.SP_CLIENT_ID;
            const password = process.env.SP_PASSWORD;
            const tenant = process.env.SP_TENANT;

            return this.msrestAzureObj.loginWithServicePrincipalSecret(clientId, password, tenant, { tokenAudience: resource });
        }

        throw new Error(`Authentication method '${this.authenticationMethod}' is not supported.`);
    }
}
