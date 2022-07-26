// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Authenticator } from './authenticator';
import { AuthenticatorFactory } from './authenticator-factory';
import { AzureActiveDirectoryAuthentication } from './azure-active-directory-authenticator';

describe(AuthenticatorFactory, () => {
    const testAccountName = 'testServiceAccount';
    const testAccountPassword = 'Placeholder_test123';
    let authenticatorFactory: AuthenticatorFactory;

    beforeEach(() => {
        authenticatorFactory = new AuthenticatorFactory();
    });

    it('createAuthenticator uses AAD authentication with supplied credentials when authType is set to AAD', async () => {
        const authType = 'AAD';
        const testAuthenticationMethod = new AzureActiveDirectoryAuthentication(testAccountName, testAccountPassword);
        const authenticator = authenticatorFactory.createAuthenticator(testAccountName, testAccountPassword, authType);
        expect(authenticator).toEqual(new Authenticator(testAuthenticationMethod));
    });
});
