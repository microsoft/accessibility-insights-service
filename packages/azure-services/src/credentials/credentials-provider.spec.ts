// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { CredentialsProvider } from './credentials-provider';
import { MSICredentialsProvider } from './msi-credential-provider';

// tslint:disable: no-any

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msiCredProviderMock: IMock<MSICredentialsProvider>;
    // tslint:disable-next-line: mocha-no-side-effect-code
    const credentialsStub = 'test credentials' as any;

    beforeEach(() => {
        msiCredProviderMock = Mock.ofType(MSICredentialsProvider);
    });

    it('gets key vault credentials with MSI auth', async () => {
        testSubject = new CredentialsProvider(msiCredProviderMock.object);

        msiCredProviderMock
            .setup(async r => r.getCredentials('https://vault.azure.net'))
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForKeyVault();

        expect(actualCredentials).toBe(credentialsStub);
        msiCredProviderMock.verifyAll();
    });
});
