// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-null-keyword mocha-no-side-effect-code no-any no-unsafe-any
import 'reflect-metadata';

import { AuthenticationContext, TokenResponse } from 'adal-node';
import * as requestPromise from 'request-promise';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from './test-utilities/mockable-logger';

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
    const numTokenRetries = 4;
    let loggerMock: IMock<MockableLogger>;

    let error: Error;

    beforeEach(() => {
        error = null;
        requestMock = Mock.ofType<typeof requestPromise>(null);
        authenticationContextMock = Mock.ofType<AuthenticationContext>();
        loggerMock = Mock.ofType<MockableLogger>();

        testSubject = new A11yServiceCredential(
            clientId,
            clientMockSec,
            resource,
            authorityUrl,
            loggerMock.object,
            authenticationContextMock.object,
            numTokenRetries,
        );

        authenticationContextMock
            .setup(am => am.acquireTokenWithClientCredentials(resource, clientId, clientMockSec, It.isAny()))
            .callback((resourceUrl, cid, sec, callback) => {
                callback(error, tokenResponse);
            });
    });

    afterEach(() => {
        authenticationContextMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('getToken', async () => {
        const token = await testSubject.getToken();
        expect(token).toEqual(tokenResponse);
    });

    it('signRequest', async () => {
        const expectedHeaders = {
            headers: {
                authorization: `${tokenResponse.tokenType} ${tokenResponse.accessToken}`,
            },
        };

        await testSubject.signRequest(requestMock.object);

        requestMock.verify(rm => rm.defaults(It.isValue(expectedHeaders)), Times.once());
    });

    it('should reject when acquireTokenWithClientCredentials fails', async () => {
        error = new Error('err');
        setupAuthFailureLogs(numTokenRetries + 1, true);
        await testSubject.getToken().catch(reason => expect(reason).not.toBeUndefined());
    });

    it('getTokenWithRetries fails after maxRetries', async () => {
        error = new Error('err');
        setupAuthFailureLogs(numTokenRetries + 1, true);
        authenticationContextMock.reset();
        authenticationContextMock
            .setup(am => am.acquireTokenWithClientCredentials(resource, clientId, clientMockSec, It.isAny()))
            .callback((resourceUrl, cid, sec, callback) => {
                callback(error, tokenResponse);
            })
            .verifiable(Times.exactly(numTokenRetries + 1));

        await testSubject.getToken().catch(reason => expect(reason).not.toBeUndefined());
    });

    it('getTokenWithRetries succeeds before maxRetries', async () => {
        error = new Error('err');
        setupAuthFailureLogs(1, false);
        authenticationContextMock.reset();
        authenticationContextMock
            .setup(am => am.acquireTokenWithClientCredentials(resource, clientId, clientMockSec, It.isAny()))
            .callback((resourceUrl, cid, sec, callback) => {
                callback(error, tokenResponse);
                error = undefined;
            })
            .verifiable(Times.exactly(2));

        await testSubject.getToken().catch(reason => expect(reason).not.toBeUndefined());
    });

    function setupAuthFailureLogs(numFailures: number, allRetriesFail: boolean): void {
        loggerMock
            .setup(l => l.logError(`Auth getToken call failed with error: ${JSON.stringify(error)}`))
            .verifiable(Times.exactly(numFailures));
        if (allRetriesFail) {
            loggerMock.setup(l => l.logError(`Could not get auth token after ${numFailures - 1} retries.`)).verifiable();
        }
    }
});
