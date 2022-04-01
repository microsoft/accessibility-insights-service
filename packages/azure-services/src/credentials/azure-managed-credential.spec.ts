// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import NodeCache from 'node-cache';
import { IMock, Mock, Times } from 'typemoq';
import { Mutex } from 'async-mutex';
import { ManagedIdentityCredential } from '@azure/identity';
import { AzureManagedCredential } from './azure-managed-credential';

const scopes = 'https://vault.azure.net/default';
const resourceUrl = 'vault.azure.net';
const accessToken = { token: 'eyJ0e_3g', expiresOnTimestamp: 1633500000 };
const accessTokenOptions = {};
const cacheCheckPeriodInSeconds = 60;

describe(AzureManagedCredential, () => {
    let tokenCacheMock: IMock<NodeCache>;
    let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;
    let azureManagedCredential: AzureManagedCredential;

    beforeEach(() => {
        tokenCacheMock = Mock.ofType<NodeCache>();
        managedIdentityCredentialMock = Mock.ofType<ManagedIdentityCredential>();
        azureManagedCredential = new AzureManagedCredential(managedIdentityCredentialMock.object, tokenCacheMock.object, new Mutex());
        azureManagedCredential.backOffOptions = {
            delayFirstAttempt: false,
            numOfAttempts: 2,
            maxDelay: 10,
            startingDelay: 0,
        };
    });

    afterEach(() => {
        managedIdentityCredentialMock.verifyAll();
        tokenCacheMock.verifyAll();
    });

    it('get token from a service', async () => {
        tokenCacheMock
            .setup((o) => o.get(resourceUrl))
            .returns(() => undefined)
            .verifiable();
        tokenCacheMock
            .setup((o) => o.set(resourceUrl, accessToken, accessToken.expiresOnTimestamp - cacheCheckPeriodInSeconds * 1000 * 3))
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
            .setup((o) => o.set(resourceUrl, accessToken, accessToken.expiresOnTimestamp - cacheCheckPeriodInSeconds * 1000 * 3))
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
            .setup((o) => o.set(resourceUrl, accessToken, accessToken.expiresOnTimestamp - cacheCheckPeriodInSeconds * 1000 * 3))
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
