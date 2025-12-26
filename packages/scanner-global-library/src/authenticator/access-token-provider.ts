// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, GetTokenOptions, TokenCredential } from '@azure/core-auth';
import { injectable } from 'inversify';
import { AzureCliCredential, ManagedIdentityCredential } from '@azure/identity';
import { isEmpty } from 'lodash';

export interface AccessTokenProviderOptions {
    clientId?: string;
}

@injectable()
export class AccessTokenProvider implements TokenCredential {
    /**
     * Creates an instance of the {@link AccessTokenProvider}.
     *
     * Optional environment variables:
     * - `AZ_CLI_AUTH`: If the environment variable value set to 'true' the credential will use the currently
     * logged-in user login information via the Azure CLI ('az') command line tool.
     */
    constructor(private readonly azCliAuth?: boolean) {
        this.azCliAuth = this.azCliAuth ?? process.env.AZ_CLI_AUTH === 'true';
    }

    public async getWebsiteToken(): Promise<AccessToken> {
        return this.getToken('https://storage.azure.com/');
    }

    public async getToken(scopes: string | string[], options?: GetTokenOptions & AccessTokenProviderOptions): Promise<AccessToken> {
        const scope = this.getResource(scopes);
        const clientId = options?.clientId ?? process.env.AZURE_CLIENT_ID;
        const identityProvider = this.getIdentityProvider(clientId);
        const accessToken = await identityProvider.getToken(scope, options);

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
