// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { AuthenticationMethod, CredentialType, MSICredentialsProvider } from './msi-credential-provider';

// tslint:disable: no-any

describe(MSICredentialsProvider, () => {
    let testSubject: MSICredentialsProvider;
    let mockMsRestNodeAuth: IMock<typeof msRestNodeAuth>;

    beforeEach(() => {
        mockMsRestNodeAuth = Mock.ofInstance(msRestNodeAuth, MockBehavior.Strict);
    });

    it('creates credential for app service', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.AppService,
        );

        const expectedCreds = 'test creds' as any;

        mockMsRestNodeAuth
            .setup(async m => m.loginWithAppServiceMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCreds))
            .verifiable(Times.once());

        const creds = await testSubject.getCredentials('r1');

        expect(creds).toBe(expectedCreds);

        mockMsRestNodeAuth.verifyAll();
    });

    it('creates credential for vm', async () => {
        testSubject = new MSICredentialsProvider(mockMsRestNodeAuth.object, AuthenticationMethod.managedIdentity, CredentialType.VM);

        const expectedCreds = 'test creds' as any;

        mockMsRestNodeAuth
            .setup(async m => m.loginWithVmMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCreds))
            .verifiable(Times.once());

        const creds = await testSubject.getCredentials('r1');

        expect(creds).toBe(expectedCreds);

        mockMsRestNodeAuth.verifyAll();
    });

    it('creates credentials with service principal', async () => {
        process.env.SP_CLIENT_ID = 'appId';
        process.env.SP_PASSWORD = 'password';
        process.env.SP_TENANT = 'tenant';

        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.servicePrincipal,
            CredentialType.AppService,
        );

        const expectedCreds = 'test creds' as any;

        mockMsRestNodeAuth
            .setup(async m =>
                m.loginWithServicePrincipalSecret(process.env.SP_CLIENT_ID, process.env.SP_PASSWORD, process.env.SP_TENANT, {
                    tokenAudience: 'r1',
                }),
            )
            .returns(async () => Promise.resolve(expectedCreds))
            .verifiable(Times.once());

        const creds = await testSubject.getCredentials('r1');

        expect(creds).toBe(expectedCreds);

        mockMsRestNodeAuth.verifyAll();
    });
});
