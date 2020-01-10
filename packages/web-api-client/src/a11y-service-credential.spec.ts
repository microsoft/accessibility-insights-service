// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-null-keyword mocha-no-side-effect-code no-any no-unsafe-any
import 'reflect-metadata';

import { AuthenticationContext, TokenResponse } from 'adal-node';
import * as requestPromise from 'request-promise';
import { IMock, It, Mock, Times } from 'typemoq';

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

    let error: Error;

    beforeEach(() => {
        error = null;
        requestMock = Mock.ofType<typeof requestPromise>(null);
        authenticationContextMock = Mock.ofType<AuthenticationContext>();

        testSubject = new A11yServiceCredential(clientId, clientMockSec, resource, authorityUrl, authenticationContextMock.object);

        authenticationContextMock
            .setup(am => am.acquireTokenWithClientCredentials(resource, clientId, clientMockSec, It.isAny()))
            .returns((resourceUrl, cid, sec, callback) => {
                callback(error, tokenResponse);
            });
    });

    afterEach(() => {
        authenticationContextMock.verifyAll();
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
        await testSubject.getToken().catch(reason => expect(reason).not.toBeUndefined());
    });
});
