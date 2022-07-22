// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { ManagedIdentityCredential } from '@azure/identity';
import * as MockDate from 'mockdate';
import { ExponentialRetryOptions } from 'common';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import { ManagedIdentityCredentialCache, TokenCacheItem } from './managed-identity-credential-cache';

const scopes = 'https://vault.azure.net/default';
const resourceUrl = 'vault.azure.net';
const accessTokenOptions = {};
const tokenValidForSec = 55 * 60;

let tokenCacheMock: IMock<NodeCache>;
let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;
let loggerMock: IMock<Logger>;
let azureManagedCredential: ManagedIdentityCredentialCache;
let tokenCacheItem: TokenCacheItem;
let dateNow: Date;
let retryOptions: ExponentialRetryOptions;

describe(ManagedIdentityCredentialCache, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        tokenCacheItem = {
            accessToken: { token: 'eyJ0e_3g' },
            expiresOn: moment.utc().valueOf() + tokenValidForSec * 1000,
        } as TokenCacheItem;
        retryOptions = {
            delayFirstAttempt: false,
            numOfAttempts: 2,
            maxDelay: 10,
            startingDelay: 0,
        };
        tokenCacheMock = Mock.ofType<NodeCache>();
        managedIdentityCredentialMock = Mock.ofType<ManagedIdentityCredential>();
        loggerMock = Mock.ofType<Logger>();
        azureManagedCredential = new ManagedIdentityCredentialCache(
            loggerMock.object,
            managedIdentityCredentialMock.object,
            tokenCacheMock.object,
            new Mutex(),
            retryOptions,
        );
    });

    afterEach(() => {
        MockDate.reset();
        managedIdentityCredentialMock.verifyAll();
        tokenCacheMock.verifyAll();
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
            .verifiable(Times.exactly(2));

        await expect(azureManagedCredential.getToken(scopes, accessTokenOptions)).rejects.toThrowError(
            /MSI credential provider has failed./,
        );
    });
});
