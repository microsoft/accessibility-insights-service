// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { CredentialsProvider } from './credentials-provider';
// tslint:disable: no-any

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msRestAzureMock: IMock<typeof msRestNodeAuth>;
    // tslint:disable-next-line: mocha-no-side-effect-code
    const credentialsStub = 'test credentials' as any;

    beforeEach(() => {
        msRestAzureMock = Mock.ofInstance(msRestNodeAuth, MockBehavior.Strict);
        testSubject = new CredentialsProvider(msRestAzureMock.object);
    });

    it('gets key vault credentials', async () => {
        msRestAzureMock
            .setup(async r => r.loginWithVmMSI({ resource: 'https://vault.azure.net' }))
            .returns(async () => Promise.resolve(credentialsStub));

        const actualCredentials = await testSubject.getCredentialsForKeyVault();

        expect(actualCredentials).toBe(credentialsStub);
        msRestAzureMock.verifyAll();
    });
});
