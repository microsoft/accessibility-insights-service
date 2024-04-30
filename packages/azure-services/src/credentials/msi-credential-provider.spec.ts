// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { System } from 'common';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { AuthenticationMethod, CredentialType, MSICredentialsProvider } from './msi-credential-provider';

/* eslint-disable @typescript-eslint/no-explicit-any,  */

const expectedCredentials: any = 'test credentials';

describe(MSICredentialsProvider, () => {
    let testSubject: MSICredentialsProvider;
    let mockMsRestNodeAuth: IMock<typeof msRestNodeAuth>;

    beforeEach(() => {
        mockMsRestNodeAuth = Mock.ofInstance(msRestNodeAuth, MockBehavior.Strict);
    });

    afterEach(() => {
        mockMsRestNodeAuth.verifyAll();
    });

    it('creates credential for app service', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.AppService,
        );
        mockMsRestNodeAuth
            .setup(async (m) => m.loginWithAppServiceMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCredentials))
            .verifiable(Times.once());

        const credentials = await testSubject.getCredentials('r1');

        expect(credentials).toBe(expectedCredentials);
    });

    it('creates credential for vm', async () => {
        testSubject = new MSICredentialsProvider(mockMsRestNodeAuth.object, AuthenticationMethod.managedIdentity, CredentialType.VM);
        mockMsRestNodeAuth
            .setup(async (m) => m.loginWithVmMSI({ resource: 'r1' }))
            .returns(async () => Promise.resolve(expectedCredentials))
            .verifiable(Times.once());

        const credentials = await testSubject.getCredentials('r1');

        expect(credentials).toBe(expectedCredentials);
    });

    it('creates credentials using Azure CLI credentials', async () => {
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.azureCliCredentials,
            CredentialType.AppService,
        );
        const azureCliCredentials = {
            create: async () => Promise.resolve(expectedCredentials),
        } as typeof msRestNodeAuth.AzureCliCredentials;
        mockMsRestNodeAuth.object.AzureCliCredentials = azureCliCredentials;

        const credentials = await testSubject.getCredentials('r1');

        expect(credentials).toBe(expectedCredentials);
    });

    it('Throws error on failure', async () => {
        const error = new Error('msi error');
        testSubject = new MSICredentialsProvider(
            mockMsRestNodeAuth.object,
            AuthenticationMethod.managedIdentity,
            CredentialType.AppService,
        );
        mockMsRestNodeAuth
            .setup(async (m) => m.loginWithAppServiceMSI({ resource: 'r1' }))
            .returns(async () => Promise.reject(error))
            .verifiable(Times.atLeast(5));

        let caughtError: Error;
        await testSubject.getCredentials('r1').catch((err) => {
            caughtError = err as Error;
        });

        expect(caughtError).not.toBeUndefined();
        expect(caughtError.message).toEqual(`The MSICredentialsProvider provider has failed. ${System.serializeError(error)}`);
    });
});
