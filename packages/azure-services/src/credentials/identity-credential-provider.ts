// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, GetTokenOptions, TokenCredential } from '@azure/core-auth';
import { inject, injectable, optional } from 'inversify';
import { AzureCliCredential, ManagedIdentityCredential } from '@azure/identity';
import { isEmpty } from 'lodash';
import { IdentityCredentialCache } from './identity-credential-cache';

export interface IdentityCredentialProviderOptions {
    clientId?: string;
}

@injectable()
export class IdentityCredentialProvider implements TokenCredential {
    /**
     * Creates an instance of the {@link IdentityCredentialProvider}.
     *
     * Optional environment variables:
     * - `AZ_CLI_AUTH`: If the environment variable value set to 'true' the credential will use the currently
     * logged-in user login information via the Azure CLI ('az') command line tool.
     */
    constructor(
        @optional()
        @inject('IdentityCredentialCache')
        private readonly identityCredentialCache: IdentityCredentialCache = new IdentityCredentialCache(),
        @optional() @inject('azCliAuth') private readonly azCliAuth?: boolean,
    ) {
        this.azCliAuth = this.azCliAuth ?? process.env.AZ_CLI_AUTH === 'true';
    }

    public async getToken(scopes: string | string[], options?: GetTokenOptions & IdentityCredentialProviderOptions): Promise<AccessToken> {
        const scope = this.getResource(scopes);
        const identityProvider = this.getIdentityProvider(options?.clientId);
        const getAccessToken = async () => identityProvider.getToken(scope, options);
        const accessToken = await this.identityCredentialCache.getToken(scope, options?.clientId, getAccessToken);

        return accessToken;
    }

    private getIdentityProvider(clientId: string): TokenCredential {
        if (this.azCliAuth === true) {
            return new AzureCliCredential();
        } else {
            return isEmpty(clientId) ? new ManagedIdentityCredential() : new ManagedIdentityCredential(clientId);
        }
    }

    private getResource(scopes: string | string[]): string {
        let scope;
        if (typeof scopes === 'string') {
            scope = scopes;
        } else {
            scope = scopes[0];
        }

        return scope;
    }
}
