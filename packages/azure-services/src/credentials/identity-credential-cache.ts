// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { injectable } from 'inversify';
import { AccessToken } from '@azure/identity';
import NodeCache from 'node-cache';
import { Mutex } from 'async-mutex';
import moment from 'moment';
import { executeWithExponentialRetry, System } from 'common';

export interface TokenCacheItem {
    accessToken: AccessToken;
    expiresOn: number;
}

@injectable()
export class IdentityCredentialCache {
    private static readonly cacheCheckPeriodInSeconds = 60;

    private static readonly tokenValidForSec = 10 * 60;

    constructor(
        private readonly tokenCache: NodeCache = new NodeCache({ checkperiod: IdentityCredentialCache.cacheCheckPeriodInSeconds }),
        private readonly mutex: Mutex = new Mutex(),
    ) {}

    public async getToken(scope: string, clientId: string, getAccessToken: () => Promise<AccessToken>): Promise<AccessToken> {
        return this.mutex.runExclusive(async () => this.getTokenImpl(scope, clientId, getAccessToken));
    }

    private async getTokenImpl(scope: string, clientId: string, getAccessToken: () => Promise<AccessToken>): Promise<AccessToken> {
        const cacheKey = this.getCacheKey(scope, clientId);

        let tokenCacheItem = this.tokenCache.get<TokenCacheItem>(cacheKey);
        if (tokenCacheItem !== undefined && tokenCacheItem.expiresOn > moment.utc().valueOf()) {
            return tokenCacheItem.accessToken;
        }

        const accessToken = await executeWithExponentialRetry(async () => {
            try {
                return await getAccessToken();
            } catch (error) {
                throw new Error(
                    `Azure credential provider has failed. ClientId: ${clientId}. Scope: ${scope}. Error: ${System.serializeError(
                        error,
                    )}. Stack: ${new Error().stack}`,
                );
            }
        });

        tokenCacheItem = {
            accessToken,
            expiresOn: moment.utc().valueOf() + IdentityCredentialCache.tokenValidForSec * 1000,
        };
        this.tokenCache.set<TokenCacheItem>(
            cacheKey,
            tokenCacheItem,
            // cache item TTL is in seconds
            IdentityCredentialCache.tokenValidForSec,
        );

        return accessToken;
    }

    private getCacheKey(scope: string, clientId: string): string {
        const resource = this.getResource(scope);

        return clientId !== undefined ? `${resource}:${clientId}` : resource;
    }

    private getResource(scope: string): string {
        try {
            const scopeUrl = nodeUrl.parse(scope);

            return scopeUrl.hostname ?? scope;
        } catch (error) {
            return scope;
        }
    }
}
