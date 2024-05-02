// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { injectable } from 'inversify';
import { AccessToken } from '@azure/core-auth';
import {
    ManagedIdentityCredential as IdentityCredentialProvider,
    TokenCredential,
    GetTokenOptions,
    ManagedIdentityCredentialClientIdOptions,
} from '@azure/identity';
import NodeCache from 'node-cache';
import { Mutex } from 'async-mutex';
import moment from 'moment';
import { executeWithExponentialRetry, System } from 'common';

// Get a token using HTTP
// https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-to-use-vm-token#get-a-token-using-http

export interface TokenCacheItem {
    accessToken: AccessToken;
    expiresOn: number;
}

@injectable()
export class ManagedIdentityCredential implements TokenCredential {
    private static readonly cacheCheckPeriodInSeconds = 60;

    private static readonly tokenValidForSec = 10 * 60;

    constructor(
        private readonly identityCredentialProvider: IdentityCredentialProvider = new IdentityCredentialProvider(),
        private readonly tokenCache: NodeCache = new NodeCache({ checkperiod: ManagedIdentityCredential.cacheCheckPeriodInSeconds }),
        private readonly mutex: Mutex = new Mutex(),
    ) {}

    public async getToken(
        scopes: string | string[],
        options?: GetTokenOptions & ManagedIdentityCredentialClientIdOptions,
    ): Promise<AccessToken> {
        // Prevent multiple async calls to IMDS to avoid request rejection
        // The subsequent calls for the same scope will use token from a cache
        return this.mutex.runExclusive(async () => this.getMsiToken(scopes, options));
    }

    private async getMsiToken(
        scopes: string | string[],
        options?: GetTokenOptions & ManagedIdentityCredentialClientIdOptions,
    ): Promise<AccessToken> {
        const cacheKey = this.getCacheKey(scopes, options);

        // Try get token from the cache
        let tokenCacheItem = this.tokenCache.get<TokenCacheItem>(cacheKey);
        if (tokenCacheItem !== undefined && tokenCacheItem.expiresOn > moment.utc().valueOf()) {
            return tokenCacheItem.accessToken;
        }

        const accessToken = await this.getAccessToken(scopes, options);
        tokenCacheItem = {
            accessToken,
            expiresOn: moment.utc().valueOf() + ManagedIdentityCredential.tokenValidForSec * 1000,
        };
        this.tokenCache.set<TokenCacheItem>(
            cacheKey,
            tokenCacheItem,
            // cache item TTL in seconds
            ManagedIdentityCredential.tokenValidForSec,
        );

        return accessToken;
    }

    private async getAccessToken(
        scopes: string | string[],
        options?: GetTokenOptions & ManagedIdentityCredentialClientIdOptions,
    ): Promise<AccessToken> {
        return executeWithExponentialRetry(async () => {
            let token;
            try {
                if (options.clientId !== undefined) {
                    const tokenCredential = new IdentityCredentialProvider({ clientId: options.clientId });
                    token = await tokenCredential.getToken(scopes, options);
                } else {
                    token = await this.identityCredentialProvider.getToken(scopes, options);
                }
            } catch (error) {
                throw new Error(`MSI credential provider has failed. ${System.serializeError(error)}`);
            }

            return token;
        });
    }

    private getCacheKey(scopes: string | string[], options?: GetTokenOptions & ManagedIdentityCredentialClientIdOptions): string {
        const resourceUrl = this.getResourceUrl(scopes);
        const clientId = options.clientId;

        return clientId !== undefined ? `${resourceUrl}:${clientId}` : resourceUrl;
    }

    private getResourceUrl(scopes: string | string[]): string {
        let scope;
        if (typeof scopes === 'string') {
            scope = scopes;
        } else {
            scope = scopes[0];
        }
        try {
            const scopeUrl = nodeUrl.parse(scope);

            return scopeUrl.hostname ?? scope;
        } catch (error) {
            return scope;
        }
    }
}
