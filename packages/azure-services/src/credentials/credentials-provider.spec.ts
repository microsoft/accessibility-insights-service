// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { AzureCliCredential } from '@azure/identity';
import { CredentialsProvider } from './credentials-provider';
import { MSICredentialsProvider, AuthenticationMethod } from './msi-credential-provider';
import { ManagedIdentityCredentialCache } from './managed-identity-credential-cache';

/* eslint-disable @typescript-eslint/no-explicit-any */

const credentialsStub = 'test credentials' as any;

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msiCredProviderMock: IMock<MSICredentialsProvider>;
    let managedIdentityCredentialCacheMock: IMock<ManagedIdentityCredentialCache>;

    beforeEach(() => {
        msiCredProviderMock = Mock.ofType(MSICredentialsProvider);
        managedIdentityCredentialCacheMock = Mock.ofType(ManagedIdentityCredentialCache);
        testSubject = new CredentialsProvider(
            msiCredProviderMock.object,
            managedIdentityCredentialCacheMock.object,
            AuthenticationMethod.managedIdentity,
        );
    });

    afterEach(() => {
        msiCredProviderMock.verifyAll();
    });

    it('getCredentialForBatch gets batch credentials with MSI auth', async () => {
        msiCredProviderMock
            .setup(async (r) => r.getCredentials('https://batch.core.windows.net/'))
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForBatch();
        expect(actualCredentials).toBe(credentialsStub);
    });

    it('getAzureCredential creates ManagedIdentityCredentialCache instance', () => {
        const credential = testSubject.getAzureCredential();
        expect(credential).toBe(managedIdentityCredentialCacheMock.object);
    });

    it('getAzureCredential creates AzureCliCredential instance', () => {
        testSubject = new CredentialsProvider(
            msiCredProviderMock.object,
            managedIdentityCredentialCacheMock.object,
            AuthenticationMethod.azureCliCredentials,
        );
        const credential = testSubject.getAzureCredential();
        expect(credential).toBeInstanceOf(AzureCliCredential);
    });
});
