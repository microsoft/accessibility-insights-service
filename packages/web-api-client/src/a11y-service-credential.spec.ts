// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { RetryHelper } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { Got } from 'got';
import * as msal from '@azure/msal-node';
import { A11yServiceCredential } from './a11y-service-credential';
import { MockableLogger } from './test-utilities/mockable-logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

let clientApplicationMock: IMock<msal.ConfidentialClientApplication>;
let testSubject: A11yServiceCredential;
let gotMock: IMock<Got>;
let loggerMock: IMock<MockableLogger>;
let retryHelperMock: IMock<RetryHelper<msal.AuthenticationResult>>;
let error: Error;

const clientId = 'client-id';
const clientSecret = 'random-string';
const authorityUrl = 'authorityUrl';
const scope = 'scope';
const authenticationResult: msal.AuthenticationResult = {
    tokenType: 'type',
    accessToken: 'at',
} as any;
const numTokenAttempts = 5;

describe(A11yServiceCredential, () => {
    beforeEach(() => {
        gotMock = Mock.ofType<Got>(null);
        clientApplicationMock = Mock.ofType<msal.ConfidentialClientApplication>();
        loggerMock = Mock.ofType<MockableLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<msal.AuthenticationResult>>();
        clientApplicationMock
            .setup((o) => o.acquireTokenByClientCredential(It.isAny()))
            .returns(() => Promise.resolve(authenticationResult))
            .verifiable();

        testSubject = new A11yServiceCredential(
            clientId,
            clientSecret,
            scope,
            authorityUrl,
            loggerMock.object,
            numTokenAttempts,
            0,
            retryHelperMock.object,
            clientApplicationMock.object,
        );
    });

    afterEach(() => {
        clientApplicationMock.verifyAll();
        loggerMock.verifyAll();
        retryHelperMock.verifyAll();
    });

    it('getToken', async () => {
        setupRetryHelperMock();
        const token = await testSubject.getToken();
        expect(token).toEqual(authenticationResult);
    });

    it('signRequest', async () => {
        setupRetryHelperMock();
        const expectedHeaders = {
            headers: {
                authorization: `${authenticationResult.tokenType} ${authenticationResult.accessToken}`,
            },
        };

        await testSubject.signRequest(gotMock.object);

        gotMock.verify((rm) => rm.extend(It.isValue(expectedHeaders)), Times.once());
    });

    it('should reject when acquire credentials fails', async () => {
        error = new Error('Token error');
        clientApplicationMock.reset();
        clientApplicationMock
            .setup((o) => o.acquireTokenByClientCredential(It.isAny()))
            .returns(() => Promise.reject(error))
            .verifiable();
        setupRetryHelperMock();

        await expect(testSubject.getToken()).rejects.toThrowError('Error while acquiring Azure AD client token.');
    });

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup((o) => o.executeWithRetries(It.isAny(), It.isAny(), numTokenAttempts, 0))
            .returns(async (action: () => Promise<msal.AuthenticationResult>) => {
                return action();
            })
            .verifiable();
    }
});
