// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { ManagedIdentityCredential, AccessToken } from '@azure/identity';
import * as MockDate from 'mockdate';
import { ExponentialRetryOptions } from 'common';
import { ManagedIdentityCredentialCache } from './managed-identity-credential-cache';

const scopes = 'https://vault.azure.net/default';
const resourceUrl = 'vault.azure.net';
const accessTokenOptions = {};
const tokenExpirationReductionMsec = 7200000;
const getCacheTtl = (token: AccessToken): number => (token.expiresOnTimestamp - tokenExpirationReductionMsec) / 1000;

let tokenCacheMock: IMock<NodeCache>;
let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;
let azureManagedCredential: ManagedIdentityCredentialCache;
let accessToken: AccessToken;
let dateNow: Date;
let retryOptions: ExponentialRetryOptions;

describe(ManagedIdentityCredentialCache, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        accessToken = { token: 'eyJ0e_3g', expiresOnTimestamp: dateNow.valueOf() + tokenExpirationReductionMsec + 60000 };
        retryOptions = {
            delayFirstAttempt: false,
            numOfAttempts: 2,
            maxDelay: 10,
            startingDelay: 0,
        };
        tokenCacheMock = Mock.ofType<NodeCache>();
        managedIdentityCredentialMock = Mock.ofType<ManagedIdentityCredential>();
        azureManagedCredential = new ManagedIdentityCredentialCache(
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
            .setup((o) => o.set(resourceUrl, accessToken, getCacheTtl(accessToken)))
            .returns(() => true)
            .verifiable();
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scopes, accessTokenOptions))
            .returns(() => Promise.resolve(accessToken))
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('get token from a service on token expiration', async () => {
        accessToken.expiresOnTimestamp = dateNow.valueOf() + tokenExpirationReductionMsec;
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => accessToken)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, accessToken, getCacheTtl(accessToken)))
            .returns(() => true)
            .verifiable();
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scopes, accessTokenOptions))
            .returns(() => Promise.resolve(accessToken))
            .verifiable();

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('get token from a cache', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => accessToken)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, accessToken, getCacheTtl(accessToken)))
            .returns(() => true)
            .verifiable(Times.never());

        const actualAccessToken = await azureManagedCredential.getToken(scopes, accessTokenOptions);

        expect(actualAccessToken).toEqual(accessToken);
    });

    it('failed to get token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, accessToken, getCacheTtl(accessToken)))
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
