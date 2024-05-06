// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { AccessToken } from '@azure/identity';
import * as MockDate from 'mockdate';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { IdentityCredentialCache, TokenCacheItem } from './identity-credential-cache';

const scopes = 'https://vault.azure.net/default';
const resourceUrl = 'vault.azure.net';
const tokenValidForSec = 10 * 60;

let tokenCacheMock: IMock<NodeCache>;
let tokenCacheItem: TokenCacheItem;
let dateNow: Date;
let accessToken: AccessToken;
let getAccessToken: () => Promise<AccessToken>;
let identityCredentialCache: IdentityCredentialCache;

describe(IdentityCredentialCache, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        tokenCacheMock = Mock.ofType<NodeCache>();
        accessToken = { token: 'eyJ0e_3g' } as AccessToken;
        tokenCacheItem = {
            accessToken,
            expiresOn: moment.utc().valueOf() + tokenValidForSec * 1000,
        } as TokenCacheItem;
        getAccessToken = async () => Promise.resolve(accessToken);

        identityCredentialCache = new IdentityCredentialCache(tokenCacheMock.object, new Mutex());
    });

    afterEach(() => {
        MockDate.reset();
        tokenCacheMock.verifyAll();
    });

    it('get token from a cache for a guid scope', async () => {
        const cacheKey = 'resource-guid-1:clientId-1';
        tokenCacheMock
            .setup((o) => o.get(cacheKey))
            .returns(() => tokenCacheItem)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(cacheKey, tokenCacheItem, tokenValidForSec))
            .returns(() => true)
            .verifiable(Times.never());

        const actualAccessToken = await identityCredentialCache.getToken('resource-guid-1', 'clientId-1', getAccessToken);

        expect(actualAccessToken).toEqual(tokenCacheItem.accessToken);
    });

    it('get token from a service on cache miss', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, tokenCacheItem, tokenValidForSec))
            .returns(() => true)
            .verifiable();

        const actualAccessToken = await identityCredentialCache.getToken(scopes, undefined, getAccessToken);

        expect(actualAccessToken).toEqual(tokenCacheItem.accessToken);
    });

    it('get token from a service on token expiration', async () => {
        const currentTokenCacheItem = cloneDeep(tokenCacheItem);
        currentTokenCacheItem.expiresOn = moment.utc().valueOf() - 1;
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => currentTokenCacheItem)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, tokenCacheItem, tokenValidForSec))
            .returns(() => true)
            .verifiable();

        const actualAccessToken = await identityCredentialCache.getToken(scopes, undefined, getAccessToken);

        expect(actualAccessToken).toEqual(tokenCacheItem.accessToken);
    });

    it('get token from a cache', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => tokenCacheItem)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, tokenCacheItem, tokenValidForSec))
            .returns(() => true)
            .verifiable(Times.never());

        const actualAccessToken = await identityCredentialCache.getToken(scopes, undefined, getAccessToken);

        expect(actualAccessToken).toEqual(tokenCacheItem.accessToken);
    });

    it('failed to get token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, tokenCacheItem, tokenValidForSec))
            .returns(() => true)
            .verifiable(Times.never());
        getAccessToken = async () => Promise.reject(new Error('msi service error'));

        await expect(identityCredentialCache.getToken(scopes, undefined, getAccessToken)).rejects.toThrowError(
            /Credential provider has failed./,
        );
    });
});
