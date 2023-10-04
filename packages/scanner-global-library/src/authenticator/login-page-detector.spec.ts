// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { LoginPageDetector } from './login-page-detector';

let loginPageDetector: LoginPageDetector;

describe(LoginPageDetector, () => {
    beforeEach(() => {
        loginPageDetector = new LoginPageDetector();
    });

    it('should return login hint', () => {
        const url = 'https://example.com/12345-67890/oauth2/authorize?client_id=1';
        expect(loginPageDetector.getAuthenticationType(url)).toEqual('unknown');
    });

    it('should return client type for Azure login', () => {
        const url = 'https://login.MicrosoftOnline.com/12345-67890/oauth2/authorize?client_id=1';
        expect(loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });

    it('should return client type for Live login', () => {
        const url = 'https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=13';
        expect(loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });

    it('should skip for unknown URL', () => {
        const url = 'https://localhost/';
        expect(loginPageDetector.getAuthenticationType(url)).toBeUndefined();
    });

    it('should skip for empty URL', () => {
        expect(loginPageDetector.getAuthenticationType(undefined)).toBeUndefined();
    });
});
