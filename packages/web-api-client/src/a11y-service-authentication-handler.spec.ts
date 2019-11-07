// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-null-keyword mocha-no-side-effect-code no-any no-unsafe-any
import 'reflect-metadata';

import { AuthenticationContext, TokenResponse } from 'adal-node';
import { IMock, It, Mock } from 'typemoq';

import { A11yServiceAuthenticationHandler, A11yServiceCredential } from './a11y-service-authentication-handler';

describe(A11yServiceAuthenticationHandler, () => {
    let authenticationContextMock: IMock<AuthenticationContext>;
    let testSubject: A11yServiceAuthenticationHandler;
    const credential: A11yServiceCredential = {
        clientId: 'client-id',
        clientSecret: 'client-sec',
        authorityUrl: 'authorityUrl',
    };
    const resource = 'resource-id';
    // tslint:disable-next-line:
    const tokenResponse: TokenResponse = {
        tokenType: 'type',
        accessToken: 'at',
    } as any;

    let error: Error;

    beforeEach(() => {
        error = null;
        authenticationContextMock = Mock.ofType<AuthenticationContext>();
        authenticationContextMock
            .setup(am => am.acquireTokenWithClientCredentials(resource, credential.clientId, credential.clientSecret, It.isAny()))
            .returns((resourceUrl, clientId, clientSecret, callback) => {
                callback(error, tokenResponse);
            });

        testSubject = new A11yServiceAuthenticationHandler(credential, authenticationContextMock.object, resource);
    });

    afterEach(() => {
        authenticationContextMock.verifyAll();
    });

    it('getToken', async () => {
        const token = await testSubject.getToken();
        expect(token).toEqual(tokenResponse);
    });

    it('getAuthHeaders', async () => {
        const expectedHeaders = {
            headers: {
                authorization: `${tokenResponse.tokenType} ${tokenResponse.accessToken}`,
            },
        };
        const headers = await testSubject.getAuthHeaders();
        expect(headers).toEqual(expectedHeaders);
    });

    it('should reject when acquireTokenWithClientCredentials fails', async () => {
        error = new Error('err');
        const token = await testSubject.getToken().catch(reason => expect(reason).not.toBeUndefined());
    });
});
