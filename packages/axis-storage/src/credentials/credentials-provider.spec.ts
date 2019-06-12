// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { AuthenticationMethod, CredentialsProvider } from './credentials-provider';
// tslint:disable: no-any

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msRestAzureMock: IMock<typeof msRestNodeAuth>;
    // tslint:disable-next-line: mocha-no-side-effect-code
    const credentialsStub = 'test credentials' as any;

    beforeEach(() => {
        msRestAzureMock = Mock.ofInstance(msRestNodeAuth, MockBehavior.Strict);
    });

    it('gets key vault credentials with MSI auth', async () => {
        testSubject = new CredentialsProvider(msRestAzureMock.object, AuthenticationMethod.managedIdentity);

        msRestAzureMock
            .setup(async r => r.loginWithVmMSI({ resource: 'https://vault.azure.net' }))
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForKeyVault();

        expect(actualCredentials).toBe(credentialsStub);
        msRestAzureMock.verifyAll();
    });

    it('gets key vault credentials with SP auth', async () => {
        process.env.SP_CLIENT_ID = 'appId';
        process.env.SP_PASSWORD = 'password';
        process.env.SP_TENANT = 'tenant';

        testSubject = new CredentialsProvider(msRestAzureMock.object, AuthenticationMethod.servicePrincipal);

        msRestAzureMock
            .setup(async r =>
                r.loginWithServicePrincipalSecret('appId', 'password', 'tenant', { tokenAudience: 'https://vault.azure.net' }),
            )
            .returns(async () => Promise.resolve(credentialsStub))
            .verifiable(Times.once());

        const actualCredentials = await testSubject.getCredentialsForKeyVault();

        expect(actualCredentials).toBe(credentialsStub);
        msRestAzureMock.verifyAll();
    });
});
