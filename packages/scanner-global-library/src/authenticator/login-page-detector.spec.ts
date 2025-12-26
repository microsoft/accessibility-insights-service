// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ServiceConfiguration, AvailabilityTestConfig } from 'common';
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
let serviceConfigMock: IMock<ServiceConfiguration>;

describe(LoginPageDetector, () => {
    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        serviceConfigMock.setup((s) => s.getConfigValue('availabilityTestConfig')).returns(() => Promise.resolve(undefined));
        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);
    });

    it('should detect know providers', async () => {
        for (const provider of authProviders) {
            const actualProviderType = await loginPageDetector.getAuthenticationType(provider.url);
            expect(actualProviderType).toEqual(provider.type);
        }
    });

    it('should return authentication provider type for Azure AD', async () => {
        const url = 'https://login.MicrosoftOnline.com/12345-67890/oauth2/authorize?client_id=1';
        expect(await loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });

    it('should skip unknown provider', async () => {
        const url = 'https://localhost/';
        expect(await loginPageDetector.getAuthenticationType(url)).toBeUndefined();
    });

    it('should skip empty URL', async () => {
        expect(await loginPageDetector.getAuthenticationType(undefined)).toBeUndefined();
    });

    it('should return Azure AD provider for Microsoft sites', async () => {
        const url =
            'https://login.live.com/login.srf?wa=wsignin1.0&rpsnv=1&ct=1&rver=1&wp=SSL&wreply=https:%2F%2Fsway.cloud.microsoft%2Fauthredir&lc=1033&id=1&lw=1&aadredir=1';
        expect(await loginPageDetector.getAuthenticationType(url)).toEqual('entraId');
    });

    it('should not detect false positives with similar substrings', async () => {
        const falsePositiveUrls = [
            'https://example.com/design-insights',
            'https://example.com/design-insights/report',
            'https://example.com/assign-insights',
            'https://example.com/consignor',
            'https://example.com/ensign',
        ];

        for (const url of falsePositiveUrls) {
            expect(await loginPageDetector.getAuthenticationType(url)).toBeUndefined();
        }
    });

    it('should return bearerToken when URL matches availabilityTestConfig urlToScan with same protocol and host', async () => {
        serviceConfigMock.reset();
        serviceConfigMock
            .setup((s) => s.getConfigValue('availabilityTestConfig'))
            .returns(() => Promise.resolve({ urlToScan: 'https://test-website.com' }) as Promise<AvailabilityTestConfig>);

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('https://test-website.com')).toEqual('bearerToken');
        expect(await loginPageDetector.getAuthenticationType('https://test-website.com/')).toEqual('bearerToken');
        expect(await loginPageDetector.getAuthenticationType('https://test-website.com/path')).toEqual('bearerToken');
        expect(await loginPageDetector.getAuthenticationType('https://test-website.com/path?query=value')).toEqual('bearerToken');
    });

    it('should not return bearerToken when protocol does not match', async () => {
        serviceConfigMock.reset();
        serviceConfigMock
            .setup((s) => s.getConfigValue('availabilityTestConfig'))
            .returns(() => Promise.resolve({ urlToScan: 'https://test-website.com' }) as Promise<AvailabilityTestConfig>);

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('http://test-website.com')).toBeUndefined();
    });

    it('should not return bearerToken when host does not match', async () => {
        serviceConfigMock.reset();
        serviceConfigMock
            .setup((s) => s.getConfigValue('availabilityTestConfig'))
            .returns(() => Promise.resolve({ urlToScan: 'https://test-website.com' }) as Promise<AvailabilityTestConfig>);

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('https://other-website.com')).toBeUndefined();
        expect(await loginPageDetector.getAuthenticationType('https://test-website.com.evil.com')).toBeUndefined();
    });

    it('should handle invalid urlToScan in config', async () => {
        serviceConfigMock.reset();
        serviceConfigMock
            .setup((s) => s.getConfigValue('availabilityTestConfig'))
            .returns(() => Promise.resolve({ urlToScan: 'not-a-valid-url' }) as Promise<AvailabilityTestConfig>);

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('https://test-website.com')).toBeUndefined();
    });

    it('should handle missing availabilityTestConfig', async () => {
        serviceConfigMock.reset();
        serviceConfigMock.setup((s) => s.getConfigValue('availabilityTestConfig')).returns(() => Promise.resolve(undefined));

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('https://test-website.com')).toBeUndefined();
    });

    it('should handle missing urlToScan in availabilityTestConfig', async () => {
        serviceConfigMock.reset();
        serviceConfigMock
            .setup((s) => s.getConfigValue('availabilityTestConfig'))
            .returns(() => Promise.resolve({}) as Promise<AvailabilityTestConfig>);

        loginPageDetector = new LoginPageDetector(serviceConfigMock.object);

        expect(await loginPageDetector.getAuthenticationType('https://test-website.com')).toBeUndefined();
    });
});
