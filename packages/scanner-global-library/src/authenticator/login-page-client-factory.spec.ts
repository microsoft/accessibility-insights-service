// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { LoginPageClientFactory } from './login-page-client-factory';
import { AzureLoginPageClient } from './azure-login-page-client';
import { LoginPageType } from './login-page-detector';

let azureLoginPageClientMock: IMock<AzureLoginPageClient>;
let loginPageClientFactory: LoginPageClientFactory;

describe(LoginPageClientFactory, () => {
    beforeEach(() => {
        azureLoginPageClientMock = Mock.ofType<AzureLoginPageClient>();
        loginPageClientFactory = new LoginPageClientFactory(azureLoginPageClientMock.object);
    });

    it('should return AzureLoginPageClient instance', () => {
        expect(loginPageClientFactory.getPageClient('MicrosoftAzure')).toEqual(azureLoginPageClientMock.object);
    });

    it('should throw if client not found', () => {
        expect(() => loginPageClientFactory.getPageClient('OtherType' as LoginPageType)).toThrowError(
            `Login page type OtherType is not supported.`,
        );
    });
});
