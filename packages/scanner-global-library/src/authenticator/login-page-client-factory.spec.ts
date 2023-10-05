// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { AuthenticationType } from 'storage-documents';
import { LoginPageClientFactory } from './login-page-client-factory';
import { AzureLoginPageClient } from './azure-login-page-client';

let azureLoginPageClientMock: IMock<AzureLoginPageClient>;
let loginPageClientFactory: LoginPageClientFactory;

describe(LoginPageClientFactory, () => {
    beforeEach(() => {
        azureLoginPageClientMock = Mock.ofType<AzureLoginPageClient>();
        loginPageClientFactory = new LoginPageClientFactory(azureLoginPageClientMock.object);
    });

    it('should return client instance', () => {
        expect(loginPageClientFactory.getPageClient('entraId')).toEqual(azureLoginPageClientMock.object);
    });

    it('should return undefined', () => {
        expect(loginPageClientFactory.getPageClient('undetermined')).toBeUndefined();
    });

    it('should return undefined', () => {
        expect(loginPageClientFactory.getPageClient('other' as AuthenticationType)).toBeUndefined();
    });
});
