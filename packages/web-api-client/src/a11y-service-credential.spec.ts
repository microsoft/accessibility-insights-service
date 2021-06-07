// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AuthenticationContext, TokenResponse } from 'adal-node';
import { RetryHelper, System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { Got } from 'got';
import { A11yServiceCredential } from './a11y-service-credential';
import { MockableLogger } from './test-utilities/mockable-logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(A11yServiceCredential, () => {
    let authenticationContextMock: IMock<AuthenticationContext>;
    let testSubject: A11yServiceCredential;
    let gotMock: IMock<Got>;
    const clientId = 'client-id';
    const clientMockSec = 'random-string';
    const authorityUrl = 'authorityUrl';
    const resource = 'resource-id';
    const tokenResponse: TokenResponse = {
        tokenType: 'type',
        accessToken: 'at',
    } as any;
    const numTokenAttempts = 5;
    let loggerMock: IMock<MockableLogger>;
    let retryHelperMock: IMock<RetryHelper<TokenResponse>>;
    let error: Error;

    beforeEach(() => {
        error = null;
        gotMock = Mock.ofType<Got>(null);
        authenticationContextMock = Mock.ofType<AuthenticationContext>();
        loggerMock = Mock.ofType<MockableLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<TokenResponse>>();

        testSubject = new A11yServiceCredential(
            clientId,
            clientMockSec,
            resource,
            authorityUrl,
            loggerMock.object,
            authenticationContextMock.object,
            numTokenAttempts,
            0,
            retryHelperMock.object,
        );

        authenticationContextMock
            .setup((am) => am.acquireTokenWithClientCredentials(resource, clientId, clientMockSec, It.isAny()))
            .callback((resourceUrl, cid, sec, callback) => {
                callback(error, tokenResponse);
            });
    });

    afterEach(() => {
        authenticationContextMock.verifyAll();
        loggerMock.verifyAll();
        retryHelperMock.verifyAll();
    });

    it('getToken', async () => {
        setupRetryHelperMock(false);
        const token = await testSubject.getToken();
        expect(token).toEqual(tokenResponse);
    });

    it('signRequest', async () => {
        setupRetryHelperMock(false);
        const expectedHeaders = {
            headers: {
                authorization: `${tokenResponse.tokenType} ${tokenResponse.accessToken}`,
            },
        };

        await testSubject.signRequest(gotMock.object);

        gotMock.verify((rm) => rm.extend(It.isValue(expectedHeaders)), Times.once());
    });

    it('should reject when acquireTokenWithClientCredentials fails', async () => {
        error = new Error('err');
        setupRetryHelperMock(true);
        loggerMock.setup((l) => l.logError(`Error while acquiring Azure AD client token. ${System.serializeError(error)}`)).verifiable();

        let caughtError: Error;
        await testSubject.getToken().catch((reason) => {
            caughtError = reason;
        });
        expect(caughtError).not.toBeUndefined();
    });

    function setupRetryHelperMock(shouldFail: boolean): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), numTokenAttempts, 0))
            .returns(async (action: () => Promise<TokenResponse>, errorHandler: (err: Error) => Promise<void>, maxAttempts: number) => {
                if (shouldFail) {
                    await errorHandler(error);
                    throw error;
                } else {
                    return action();
                }
            })
            .verifiable();
    }
});
