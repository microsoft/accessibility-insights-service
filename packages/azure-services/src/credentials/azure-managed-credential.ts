// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { injectable } from 'inversify';
import { AccessToken } from '@azure/core-auth';
import { TokenCredential, GetTokenOptions } from '@azure/identity';
import got, { Got, Options } from 'got';
import NodeCache from 'node-cache';
import { Mutex } from 'async-mutex';

export interface ImdsToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_on: number;
    not_before: number;
    resource: string;
    token_type: string;
}

// Get a token using HTTP
// https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-to-use-vm-token#get-a-token-using-http

@injectable()
export class AzureManagedCredential implements TokenCredential {
    private static readonly imdsEndpoint = 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-08-01';

    private static readonly cacheCheckPeriod = 600;

    private readonly httpClient: Got;

    private readonly options: Options = {
        headers: {
            Metadata: 'true',
        },
    };

    constructor(
        private readonly httpClientBase: Got = got,
        private readonly tokenCache: NodeCache = new NodeCache({ checkperiod: AzureManagedCredential.cacheCheckPeriod }),
        private readonly mutex: Mutex = new Mutex(),
    ) {
        this.httpClient = this.httpClientBase.extend({
            ...this.options,
        });
    }

    public async getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken> {
        // Prevent multiple async calls to IMDS to avoid request rejection
        // The subsequent calls for the same scope will use token from a cache
        const token = await this.mutex.runExclusive(async () => this.getMsiToken(scopes, options?.requestOptions?.timeout));

        return { token: token.access_token, expiresOnTimestamp: token.expires_on };
    }

    private async getMsiToken(scopes: string | string[], timeout: number): Promise<ImdsToken> {
        const requestUrl = this.getRequestUrl(scopes);

        // Try get token from the cache
        const cachedImdsToken = this.tokenCache.get<ImdsToken>(requestUrl);
        if (cachedImdsToken !== undefined) {
            return cachedImdsToken;
        }

        const response = await this.httpClient.get(requestUrl, { timeout });
        if (response.body === undefined) {
            throw new Error(
                `IMDS return no access token for ${process.env.AZURE_PRINCIPAL_ID} principal id and resource ${JSON.stringify(scopes)}.`,
            );
        }

        const imdsToken = JSON.parse(response.body) as ImdsToken;
        // Add token to the cache with reduced TTL to ensure that a cache item is deleted before token expiration time
        this.tokenCache.set<ImdsToken>(requestUrl, imdsToken, imdsToken.expires_in - AzureManagedCredential.cacheCheckPeriod * 2);

        return imdsToken;
    }

    private getRequestUrl(scopes: string | string[]): string {
        let scope;
        if (typeof scopes === 'string') {
            scope = scopes;
        } else {
            scope = scopes[0];
        }
        const scopeUrl = nodeUrl.parse(scope);
        const resource = `https://${scopeUrl.hostname}`;

        return `${AzureManagedCredential.imdsEndpoint}&resource=${encodeURI(resource)}&principal_id=${process.env.AZURE_PRINCIPAL_ID}`;
    }
}
