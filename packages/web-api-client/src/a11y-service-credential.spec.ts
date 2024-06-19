// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { Got } from 'got';
import { IdentityCredentialProvider } from 'azure-services';
import { A11yServiceCredential } from './a11y-service-credential';

/* eslint-disable @typescript-eslint/no-explicit-any */

const clientId = 'client-id';
const scope = 'scope';
const accessToken = { token: 'accessToken' } as any;
const token = 'externalToken';

let identityCredentialProviderMock: IMock<IdentityCredentialProvider>;
let a11yServiceCredential: A11yServiceCredential;
let gotMock: IMock<Got>;

describe(A11yServiceCredential, () => {
    beforeEach(() => {
        gotMock = Mock.ofType<Got>(null);
        identityCredentialProviderMock = Mock.ofType<IdentityCredentialProvider>();
    });

    afterEach(() => {
        identityCredentialProviderMock.verifyAll();
    });

    it('sign request using scope and clientId', async () => {
        a11yServiceCredential = new A11yServiceCredential(scope, clientId, undefined, identityCredentialProviderMock.object);
        const expectedHeaders = {
            headers: {
                authorization: `Bearer ${accessToken.token}`,
            },
        };
        identityCredentialProviderMock
            .setup((o) => o.getToken(scope, { clientId }))
            .returns(() => Promise.resolve(accessToken))
            .verifiable();

        await a11yServiceCredential.signRequest(gotMock.object);

        gotMock.verify((o) => o.extend(It.isValue(expectedHeaders)), Times.once());
    });

    it('sign request using external token', async () => {
        a11yServiceCredential = new A11yServiceCredential(undefined, undefined, token, identityCredentialProviderMock.object);
        const expectedHeaders = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };

        await a11yServiceCredential.signRequest(gotMock.object);

        gotMock.verify((o) => o.extend(It.isValue(expectedHeaders)), Times.once());
    });
});
