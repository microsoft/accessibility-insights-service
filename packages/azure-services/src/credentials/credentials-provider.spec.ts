// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { AzureCliCredential } from '@azure/identity';
import { CredentialsProvider } from './credentials-provider';
import { MSICredentialsProvider, AuthenticationMethod } from './msi-credential-provider';
import { ManagedIdentityCredential } from './managed-identity-credential-cache';

/* eslint-disable @typescript-eslint/no-explicit-any */

const credentialsStub = 'test credentials' as any;

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msiCredProviderMock: IMock<MSICredentialsProvider>;
    let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;

    beforeEach(() => {
        msiCredProviderMock = Mock.ofType(MSICredentialsProvider);
        managedIdentityCredentialMock = Mock.ofType(ManagedIdentityCredential);
        testSubject = new CredentialsProvider(
            msiCredProviderMock.object,
            managedIdentityCredentialMock.object,
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

    it('getAzureCredential creates ManagedIdentityCredential instance', () => {
        const credential = testSubject.getAzureCredential();
        expect(credential).toBe(managedIdentityCredentialMock.object);
    });

    it('getAzureCredential creates AzureCliCredential instance', () => {
        testSubject = new CredentialsProvider(
            msiCredProviderMock.object,
            managedIdentityCredentialMock.object,
            AuthenticationMethod.azureCliCredentials,
        );
        const credential = testSubject.getAzureCredential();
        expect(credential).toBeInstanceOf(AzureCliCredential);
    });
});
