// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
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
    ) {}

    public async getCredentials(resource: string): Promise<Credentials> {
        if (this.authenticationMethod === AuthenticationMethod.servicePrincipal) {
            const clientId = process.env.SP_CLIENT_ID;
            const password = process.env.SP_PASSWORD;
            const tenant = process.env.SP_TENANT;

            return this.msrestAzureObj.loginWithServicePrincipalSecret(clientId, password, tenant, { tokenAudience: resource });
        }

        if (this.credentialType === CredentialType.VM) {
            return this.msrestAzureObj.loginWithVmMSI({ resource });
        } else {
            return this.msrestAzureObj.loginWithAppServiceMSI({ resource });
        }
    }
}
