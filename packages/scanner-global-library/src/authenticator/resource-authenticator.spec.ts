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

const url = 'authUrl';

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

        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => url)
            .verifiable();

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
        const authenticationResult = {
            navigationResponse: { httpResponse: { url: () => 'url' } } as NavigationResponse,
            authenticationType: 'entraId',
            authenticated: true,
        };
        loginPageDetectorMock
            .setup((o) => o.getAuthenticationType(url))
            .returns(() => 'entraId')
            .verifiable();
        loginPageClientMock
            .setup((o) => o.login(puppeteerPageMock.object))
            .returns(() => Promise.resolve(authenticationResult.navigationResponse))
            .verifiable();
        loginPageClientFactoryMock
            .setup((o) => o.getPageClient('entraId'))
            .returns(() => loginPageClientMock.object)
            .verifiable();

        const response = await resourceAuthenticator.authenticate(puppeteerPageMock.object);
        expect(response).toEqual(authenticationResult);
    });

    it('should skip if no login page detected', async () => {
        loginPageDetectorMock
            .setup((o) => o.getAuthenticationType(url))
            .returns(() => undefined)
            .verifiable();

        const response = await resourceAuthenticator.authenticate(puppeteerPageMock.object);
        expect(response).toBeUndefined();
    });

    it('should skip if unknown authentication detected', async () => {
        loginPageDetectorMock
            .setup((o) => o.getAuthenticationType(url))
            .returns(() => 'unknown')
            .verifiable();

        const response = await resourceAuthenticator.authenticate(puppeteerPageMock.object);
        expect(response).toBeUndefined();
    });
});
