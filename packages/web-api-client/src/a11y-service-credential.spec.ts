// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { Got } from 'got';
import { ManagedIdentityCredential } from 'azure-services';
import { A11yServiceCredential } from './a11y-service-credential';

/* eslint-disable @typescript-eslint/no-explicit-any */

const clientId = 'client-id';
const scope = 'scope';
const accessToken = { token: 'token' } as any;

let managedIdentityCredentialMock: IMock<ManagedIdentityCredential>;
let testSubject: A11yServiceCredential;
let gotMock: IMock<Got>;

describe(A11yServiceCredential, () => {
    beforeEach(() => {
        gotMock = Mock.ofType<Got>(null);
        managedIdentityCredentialMock = Mock.ofType<ManagedIdentityCredential>();

        testSubject = new A11yServiceCredential(scope, clientId, managedIdentityCredentialMock.object);
    });

    afterEach(() => {
        managedIdentityCredentialMock.verifyAll();
    });

    it('signRequest', async () => {
        const expectedHeaders = {
            headers: {
                authorization: `Bearer ${accessToken.token}`,
            },
        };
        managedIdentityCredentialMock
            .setup((o) => o.getToken(scope, { clientId }))
            .returns(() => Promise.resolve(accessToken))
            .verifiable();

        await testSubject.signRequest(gotMock.object);

        gotMock.verify((o) => o.extend(It.isValue(expectedHeaders)), Times.once());
    });
});
