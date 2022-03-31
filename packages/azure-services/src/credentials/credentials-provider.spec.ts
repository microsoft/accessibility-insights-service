// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { ChainedTokenCredential, EnvironmentCredential } from '@azure/identity';
import { CredentialsProvider } from './credentials-provider';
import { MSICredentialsProvider } from './msi-credential-provider';
import { AzureManagedCredential } from './azure-managed-credential';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msiCredProviderMock: IMock<MSICredentialsProvider>;
    const credentialsStub = 'test credentials' as any;

    beforeEach(() => {
        msiCredProviderMock = Mock.ofType(MSICredentialsProvider);
    });

    it('getCredentialForBatch gets batch credentials with MSI auth', async () => {
        testSubject = new CredentialsProvider(msiCredProviderMock.object);

        msiCredProviderMock
            .setup(async (r) => r.getCredentials('https://batch.core.windows.net/'))
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForBatch();

        expect(actualCredentials).toBe(credentialsStub);
        msiCredProviderMock.verifyAll();
    });

    it('getAzureCredential creates singleton credential', () => {
        const credential = testSubject.getAzureCredential();
        //_sources:

        expect(credential).toBeInstanceOf(ChainedTokenCredential);
        expect(testSubject.getAzureCredential()).toBe(credential);
    });

    it('getAzureCredential creates credential with limited providers', () => {
        const credential = testSubject.getAzureCredential() as any;

        expect(credential._sources.length).toEqual(2);
        // credential providers sequence should match
        expect(credential._sources[0]).toBeInstanceOf(AzureManagedCredential);
        expect(credential._sources[1]).toBeInstanceOf(EnvironmentCredential);
    });
});
