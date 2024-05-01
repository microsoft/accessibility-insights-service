// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { AccessToken, ManagedIdentityCredential } from '@azure/identity';
import * as MockDate from 'mockdate';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { ManagedIdentityCredentialCache, TokenCacheItem } from './managed-identity-credential-cache';

const scopes = 'https://vault.azure.net/default';
const resourceUrl = 'vault.azure.net';
const accessTokenOptions = {};
const tokenValidForSec = 10 * 60;

let tokenCacheMock: IMock<NodeCache>;
let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;
let azureManagedCredential: ManagedIdentityCredentialCache;
let tokenCacheItem: TokenCacheItem;
let dateNow: Date;

jest.mock('@azure/identity', () => {
    return {
        ['ManagedIdentityCredential']: class ManagedIdentityCredentialStub {
            public async getToken(): Promise<AccessToken> {
                return tokenCacheItem.accessToken;
            }
        },
    };
});

describe(ManagedIdentityCredentialCache, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        tokenCacheItem = {
            accessToken: { token: 'eyJ0e_3g' },
            expiresOn: moment.utc().valueOf() + tokenValidForSec * 1000,
        } as TokenCacheItem;
        tokenCacheMock = Mock.ofType<NodeCache>();
        managedIdentityCredentialMock = Mock.ofType<ManagedIdentityCredential>();
        azureManagedCredential = new ManagedIdentityCredentialCache(
            managedIdentityCredentialMock.object,
            tokenCacheMock.object,
            new Mutex(),
        );
    });

    afterEach(() => {
        MockDate.reset();
        managedIdentityCredentialMock.verifyAll();
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

        const actualAccessToken = await azureManagedCredential.getToken('resource-guid-1', { clientId: 'clientId-1' });

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
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scopes, accessTokenOptions))
            .returns(() => Promise.resolve(tokenCacheItem.accessToken))
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

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
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scopes, accessTokenOptions))
            .returns(() => Promise.resolve(tokenCacheItem.accessToken))
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

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

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

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
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scopes, accessTokenOptions))
            .returns(() => Promise.reject(new Error('msi service error')))
            .verifiable(Times.atLeast(2));

        await expect(azureManagedCredential.getToken(scopes, accessTokenOptions)).rejects.toThrowError(
            /MSI credential provider has failed./,
        );
    });
});
