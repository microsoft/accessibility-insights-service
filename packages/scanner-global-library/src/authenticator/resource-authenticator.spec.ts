// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { NavigationResponse } from '../page-navigator';
import { ResourceAuthenticator } from './resource-authenticator';
import { LoginPageDetector } from './login-page-detector';
import { LoginPageClientFactory } from './login-page-client-factory';
import { LoginPageClient } from './azure-login-page-client';

let loginPageDetectorMock: IMock<LoginPageDetector>;
let loginPageClientFactoryMock: IMock<LoginPageClientFactory>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loginPageClientMock: IMock<LoginPageClient>;
let loggerMock: IMock<GlobalLogger>;
let resourceAuthenticator: ResourceAuthenticator;

describe(ResourceAuthenticator, () => {
    beforeEach(() => {
        loginPageClientMock = Mock.ofType<LoginPageClient>();
        loginPageDetectorMock = Mock.ofType<LoginPageDetector>();
        loginPageClientFactoryMock = Mock.ofType<LoginPageClientFactory>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loggerMock = Mock.ofType<GlobalLogger>();
        resourceAuthenticator = new ResourceAuthenticator(
            loginPageDetectorMock.object,
            loginPageClientFactoryMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        loginPageDetectorMock.verifyAll();
        loginPageClientFactoryMock.verifyAll();
        puppeteerPageMock.verifyAll();
        loginPageClientMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('should authenticate resource', async () => {
        const navigationResponse = { httpResponse: { url: () => 'url' } } as NavigationResponse;
        loginPageDetectorMock
            .setup((o) => o.getLoginPageType(puppeteerPageMock.object))
            .returns(() => 'MicrosoftAzure')
            .verifiable();
        loginPageClientMock
            .setup((o) => o.login(puppeteerPageMock.object))
            .returns(() => Promise.resolve(navigationResponse))
            .verifiable();
        loginPageClientFactoryMock
            .setup((o) => o.getPageClient('MicrosoftAzure'))
            .returns(() => loginPageClientMock.object)
            .verifiable();

        const response = await resourceAuthenticator.authenticate(puppeteerPageMock.object);
        expect(response).toEqual(navigationResponse);
    });

    it('should skip if no login page detected', async () => {
        loginPageDetectorMock
            .setup((o) => o.getLoginPageType(puppeteerPageMock.object))
            .returns(() => undefined)
            .verifiable();

        const response = await resourceAuthenticator.authenticate(puppeteerPageMock.object);
        expect(response).toBeUndefined();
    });
});
