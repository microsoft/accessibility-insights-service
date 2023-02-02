// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject, optional } from 'inversify';

export interface ServicePrincipalCredential {
    name: string;
    password: string;
}

export type CredentialProvider = () => Promise<ServicePrincipalCredential>;

@injectable()
export class ServicePrincipalCredentialProvider {
    constructor(
        @optional()
        @inject('azureAuthClientCredentialProvider')
        private readonly azureAuthClientCredentialProvider?: CredentialProvider,
    ) {}

    public async getAzureAuthClientCredential(): Promise<ServicePrincipalCredential> {
        return this.getCredential(() => {
            return {
                name: process.env.AZURE_AUTH_CLIENT_NAME,
                password: process.env.AZURE_AUTH_CLIENT_PASSWORD,
            };
        });
    }

    private async getCredential(credentialProviderFallbackFn: () => ServicePrincipalCredential): Promise<ServicePrincipalCredential> {
        let credential;
        if (this.azureAuthClientCredentialProvider !== undefined) {
            credential = await this.azureAuthClientCredentialProvider();
        }

        if (credential === undefined) {
            credential = credentialProviderFallbackFn();
        }

        this.normalizeCredential(credential);

        return credential;
    }

    private normalizeCredential(credential: ServicePrincipalCredential): void {
        // Set service principal properties to an empty string to trigger a login page input validation
        credential.name = credential.name ?? '';
        credential.password = credential.password ?? '';
    }
}
