// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Authenticator } from './authenticator';
import { AuthenticatorFactory } from './authenticator-factory';
import { AzurePortalAuthentication } from './azure-portal-authenticator';

describe(AuthenticatorFactory, () => {
    const testAccountName = 'testServiceAccount';
    const testAccountPassword = 'placeholder';
    let authenticatorFactory: AuthenticatorFactory;

    beforeEach(() => {
        authenticatorFactory = new AuthenticatorFactory();
    });

    it('createAADAuthenticator uses azure portal authentication with supplied credentials', async () => {
        const testAuthenticationMethod = new AzurePortalAuthentication(testAccountName, testAccountPassword);
        const authenticator = authenticatorFactory.createAADAuthenticator(testAccountName, testAccountPassword);
        expect(authenticator).toEqual(new Authenticator(testAuthenticationMethod));
    });
});
