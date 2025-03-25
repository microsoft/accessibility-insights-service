// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AuthenticationType } from 'storage-documents';
import { LoginPageDetector } from './login-page-detector';

const authProviders = [
    { type: 'entraId' as AuthenticationType, url: 'https://login.microsoftonline.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://login.live.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/signin' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/sign-in' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/login' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/saml2' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/api/saml2' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/api/oauth/' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/auth/' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/oauth2/' },
    { type: 'undetermined' as AuthenticationType, url: 'https://example.com/shop/login' },
    { type: 'undetermined' as AuthenticationType, url: 'https://login.example.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://accounts.google.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://github.okta.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://microsoft.auth0.com?rpsnv=1' },
    { type: 'undetermined' as AuthenticationType, url: 'https://amazon.com/ap/signin' },
    { type: 'undetermined' as AuthenticationType, url: 'https://sts.microsoft.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://adfs.microsoft.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://idp.microsoft.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://sso.microsoft.com' },
    { type: 'undetermined' as AuthenticationType, url: 'https://auth.microsoft.com' },
];

let loginPageDetector: LoginPageDetector;

describe(LoginPageDetector, () => {
    beforeEach(() => {
        loginPageDetector = new LoginPageDetector();
    });

    it('should detect know providers', () => {
        authProviders.forEach((provider) => {
            const actualProviderType = loginPageDetector.getAuthenticationType(provider.url);
            expect(actualProviderType).toEqual(provider.type);
        });
    });

    it('should return authentication provider type for Azure AD', () => {
        const url = 'https://login.MicrosoftOnline.com/12345-67890/oauth2/authorize?client_id=1';
        expect(loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });

    it('should skip unknown provider', () => {
        const url = 'https://localhost/';
        expect(loginPageDetector.getAuthenticationType(url)).toBeUndefined();
    });

    it('should skip empty URL', () => {
        expect(loginPageDetector.getAuthenticationType(undefined)).toBeUndefined();
    });

    it('should return Azure AD provider for Microsoft sites', () => {
        const url =
            'https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=1&ct=1&rver=1&wp=SSL&wreply=https:%2F%2Fsway.cloud.microsoft%2Fauthredir&lc=1033&id=1&lw=1&aadredir=1';
        expect(loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });
});
