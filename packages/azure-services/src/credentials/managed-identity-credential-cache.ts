// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { injectable, inject } from 'inversify';
import { AccessToken } from '@azure/core-auth';
import { ManagedIdentityCredential, TokenCredential, GetTokenOptions } from '@azure/identity';
import NodeCache from 'node-cache';
import { Mutex } from 'async-mutex';
import moment from 'moment';
import { executeWithExponentialRetry, ExponentialRetryOptions } from 'common';
import { GlobalLogger } from 'logger';

// Get a token using HTTP
// https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-to-use-vm-token#get-a-token-using-http

export interface TokenCacheItem {
    accessToken: AccessToken;
    expiresOn: number;
}

@injectable()
export class ManagedIdentityCredentialCache implements TokenCredential {
    private static readonly cacheCheckPeriodInSeconds = 60;

    private static readonly tokenValidForSec = 55 * 60;

    private static readonly msiRetryOptions: ExponentialRetryOptions = {
        delayFirstAttempt: false,
        numOfAttempts: 5,
        maxDelay: 6000,
        startingDelay: 0,
        retry: () => true,
    };

    constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly managedIdentityCredential: ManagedIdentityCredential = new ManagedIdentityCredential(),
        private readonly tokenCache: NodeCache = new NodeCache({ checkperiod: ManagedIdentityCredentialCache.cacheCheckPeriodInSeconds }),
        private readonly mutex: Mutex = new Mutex(),
        private readonly retryOptions: ExponentialRetryOptions = ManagedIdentityCredentialCache.msiRetryOptions,
    ) {}

    public async getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken> {
        // Prevent multiple async calls to IMDS to avoid request rejection
        // The subsequent calls for the same scope will use token from a cache
        return this.mutex.runExclusive(async () => this.getMsiToken(scopes, options));
    }

    private async getMsiToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken> {
        const resourceUrl = this.getResourceUrl(scopes);

        // Try get token from the cache
        let tokenCacheItem = this.tokenCache.get<TokenCacheItem>(resourceUrl);
        if (tokenCacheItem !== undefined && tokenCacheItem.expiresOn > moment.utc().valueOf()) {
            this.logger.logInfo('Token fetched from a cache.', { resourceUrl: resourceUrl });

            return tokenCacheItem.accessToken;
        }

        const accessToken = await this.getAccessToken(scopes, options);
        tokenCacheItem = {
            accessToken,
            expiresOn: moment.utc().valueOf() + ManagedIdentityCredentialCache.tokenValidForSec * 1000,
        };
        this.tokenCache.set<TokenCacheItem>(
            resourceUrl,
            tokenCacheItem,
            // cache item TTL in seconds
            ManagedIdentityCredentialCache.tokenValidForSec,
        );
        this.logger.logInfo('Token fetched from a service.', { resourceUrl: resourceUrl });

        return accessToken;
    }

    private async getAccessToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken> {
        return executeWithExponentialRetry(async () => {
            let token;
            try {
                token = await this.managedIdentityCredential.getToken(scopes, options);
            } catch (error) {
                throw new Error(`MSI credential provider has failed. ${JSON.stringify(error)}`);
            }

            return token;
        }, this.retryOptions);
    }

    private getResourceUrl(scopes: string | string[]): string {
        let scope;
        if (typeof scopes === 'string') {
            scope = scopes;
        } else {
            scope = scopes[0];
        }
        const scopeUrl = nodeUrl.parse(scope);

        return scopeUrl.hostname;
    }
}
