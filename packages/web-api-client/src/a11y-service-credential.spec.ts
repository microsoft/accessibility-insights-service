// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-null-keyword mocha-no-side-effect-code no-any no-unsafe-any
import 'reflect-metadata';

import { AuthenticationContext, TokenResponse } from 'adal-node';
import * as requestPromise from 'request-promise';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from './test-utilities/mockable-logger';

import { RetryHelper } from 'common';
import { A11yServiceCredential } from './a11y-service-credential';

describe(A11yServiceCredential, () => {
    let authenticationContextMock: IMock<AuthenticationContext>;
    let testSubject: A11yServiceCredential;
    let requestMock: IMock<typeof requestPromise>;
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
        requestMock = Mock.ofType<typeof requestPromise>(null);
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

        await testSubject.signRequest(requestMock.object);

        requestMock.verify((rm) => rm.defaults(It.isValue(expectedHeaders)), Times.once());
    });

    it('should reject when acquireTokenWithClientCredentials fails', async () => {
        error = new Error('err');
        setupRetryHelperMock(true);
        loggerMock.setup((l) => l.logError(`Auth getToken call failed with error: ${JSON.stringify(error)}`)).verifiable();

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
