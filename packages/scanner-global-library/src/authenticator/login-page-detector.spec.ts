// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { LoginPageDetector } from './login-page-detector';

let loginPageDetector: LoginPageDetector;

describe(LoginPageDetector, () => {
    beforeEach(() => {
        loginPageDetector = new LoginPageDetector();
    });

    it('should return MicrosoftAzure client type for Microsoft Azure login', () => {
        const url = 'https://login.MicrosoftOnline.com/12345-67890/oauth2/authorize?client_id=1';
        expect(loginPageDetector.getLoginPageType(url)).toEqual('MicrosoftAzure');
    });

    it('should return MicrosoftAzure client type for Microsoft Live login', () => {
        const url = 'https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=13';
        expect(loginPageDetector.getLoginPageType(url)).toEqual('MicrosoftAzure');
    });

    it('should skip for unknown URL', () => {
        const url = 'https://localhost/';
        expect(loginPageDetector.getLoginPageType(url)).toBeUndefined();
    });

    it('should skip for empty URL', () => {
        expect(loginPageDetector.getLoginPageType(undefined)).toBeUndefined();
    });
});
