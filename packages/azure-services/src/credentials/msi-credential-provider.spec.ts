// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { RetryHelper } from 'common';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AuthenticationMethod, Credentials, CredentialType, MSICredentialsProvider } from './msi-credential-provider';

// tslint:disable: no-any no-unsafe-any

describe(MSICredentialsProvider, () => {
    let testSubject: MSICredentialsProvider;
    let mockMsRestNodeAuth: IMock<typeof msRestNodeAuth>;
    let retryHelperMock: IMock<RetryHelper<Credentials>>;
    const maxAttempts = 3;
    const millisBetweenRetries = 0;
    const expectedCreds: any = 'test creds';

    async function retryHelperStub(
        action: () => Promise<Credentials>,
        onRetry: (err: Error) => Promise<void>,
        numMaxAttempts: number,
        numMillisBetweenRetries: number,
    ): Promise<Credentials> {
        return action();
    }

    beforeEach(() => {
        mockMsRestNodeAuth = Mock.ofInstance(msRestNodeAuth, MockBehavior.Strict);
        retryHelperMock = Mock.ofType<RetryHelper<Credentials>>();

        retryHelperMock
            .setup(r => r.executeWithRetries(It.isAny(), It.isAny(), maxAttempts, millisBetweenRetries))
            .returns(retryHelperStub)
            .verifiable();
    });

    afterEach(() => {
        retryHelperMock.verifyAll();
        mockMsRestNodeAuth.verifyAll();
    });

    it('creates credential for app service', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.AppService,
            retryHelperMock.object,
            maxAttempts,
            millisBetweenRetries,
        );

        mockMsRestNodeAuth
            .setup(async m => m.loginWithAppServiceMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCreds))
            .verifiable(Times.once());

        const creds = await testSubject.getCredentials('r1');

        expect(creds).toBe(expectedCreds);
    });

    it('creates credential for vm', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.VM,
            retryHelperMock.object,
            maxAttempts,
            millisBetweenRetries,
        );

        mockMsRestNodeAuth
            .setup(async m => m.loginWithVmMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCreds))
            .verifiable(Times.once());

        const creds = await testSubject.getCredentials('r1');

        expect(creds).toBe(expectedCreds);
    });

    it('creates credentials with service principal', async () => {
        process.env.SP_CLIENT_ID = 'appId';
        process.env.SP_PASSWORD = 'password';
        process.env.SP_TENANT = 'tenant';

        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.servicePrincipal,
            CredentialType.AppService,
            retryHelperMock.object,
            maxAttempts,
            millisBetweenRetries,
        );

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
    });

    it('Throws error on failure', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.AppService,
            retryHelperMock.object,
            maxAttempts,
            millisBetweenRetries,
        );

        const error = new Error('test error');

        retryHelperMock.reset();
        retryHelperMock
            .setup(r => r.executeWithRetries(It.isAny(), It.isAny(), It.isAny(), It.isAny()))
            .throws(error)
            .verifiable();

        let caughtError: Error;

        await testSubject.getCredentials('r1').catch(err => {
            caughtError = err as Error;
        });

        expect(caughtError).not.toBeUndefined();
        expect(caughtError.message).toEqual(`MSI getToken failed ${maxAttempts} times with error: ${JSON.stringify(error)}`);
    });
});
