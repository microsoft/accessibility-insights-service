// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AuthenticationFlow, AuthenticationStep } from './authentication-flow';
import { AuthenticatorFactory } from './authenticator-factory';

describe(AuthenticatorFactory, () => {
    const testAccountName = 'testServiceAccount';
    const testAccountPassword = 'test123';
    const baseAuthenticationSteps: AuthenticationStep[] = [
        {
            operation: 'type',
            selector: '#username',
            credential: 'name',
        },
        {
            operation: 'click',
            selector: '#1',
        },
        {
            operation: 'waitForNavigation',
        },
        {
            operation: 'type',
            selector: '#password',
            credential: 'password',
        },
        {
            operation: 'enter',
        },
        {
            operation: 'waitForNavigation',
        },
    ];
    const credentialedAuthenticationSteps: AuthenticationStep[] = [
        {
            operation: 'type',
            selector: '#username',
            credential: 'name',
            value: testAccountName,
        },
        {
            operation: 'click',
            selector: '#1',
        },
        {
            operation: 'waitForNavigation',
        },
        {
            operation: 'type',
            selector: '#password',
            credential: 'password',
            value: testAccountPassword,
        },
        {
            operation: 'enter',
        },
        {
            operation: 'waitForNavigation',
        },
    ];

    const baseAuthenticationFlow: AuthenticationFlow = {
        startingUrl: 'https://example.com',
        authenticatedUrl: 'https://example.com/en',
        steps: baseAuthenticationSteps,
    };

    class TestableAuthenticatorFactory extends AuthenticatorFactory {
        public injectCredentials(authenticationFlow: AuthenticationFlow, accountName: string, accountPassword: string ) {
            return this.injectCredentialsIntoAuthFlow(authenticationFlow, accountName, accountPassword);
        }
    }

    let authenticatorFactory: TestableAuthenticatorFactory;
    beforeEach(() => {
        authenticatorFactory = new TestableAuthenticatorFactory();
    });

    it('injectCredentialsIntoAuthFlow', async () => {
        const authenticationFlow = authenticatorFactory.injectCredentials(baseAuthenticationFlow, testAccountName, testAccountPassword);
        expect(authenticationFlow.steps).toEqual(credentialedAuthenticationSteps);
    });
});
