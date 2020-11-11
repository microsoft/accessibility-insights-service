// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { CredentialsProvider } from './credentials-provider';
import { MSICredentialsProvider } from './msi-credential-provider';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msiCredProviderMock: IMock<MSICredentialsProvider>;
    const credentialsStub = 'test credentials' as any;

    beforeEach(() => {
        msiCredProviderMock = Mock.ofType(MSICredentialsProvider);
    });

    it('gets batch credentials with MSI auth', async () => {
        testSubject = new CredentialsProvider(msiCredProviderMock.object);

        msiCredProviderMock
            .setup(async (r) => r.getCredentials('https://batch.core.windows.net/'))
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForBatch();

        expect(actualCredentials).toBe(credentialsStub);
        msiCredProviderMock.verifyAll();
    });
});
