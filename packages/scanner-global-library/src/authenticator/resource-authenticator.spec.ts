// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { NavigationResponse } from '../page-navigator';
import { PageResponseProcessor } from '../page-response-processor';
import { puppeteerTimeoutConfig } from '../page-timeout-config';
import { BrowserError } from '../browser-error';
import { ResourceAuthenticator } from './resource-authenticator';
import { LoginPageClientFactory } from './login-page-client-factory';
import { LoginPageClient } from './azure-login-page-client';

const url = 'authUrl';

let loginPageClientFactoryMock: IMock<LoginPageClientFactory>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loginPageClientMock: IMock<LoginPageClient>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let loggerMock: IMock<GlobalLogger>;
let resourceAuthenticator: ResourceAuthenticator;
let puppeteerGotoResponse: Puppeteer.HTTPResponse;

describe(ResourceAuthenticator, () => {
    beforeEach(() => {
        loginPageClientMock = Mock.ofType<LoginPageClient>();
        loginPageClientFactoryMock = Mock.ofType<LoginPageClientFactory>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        pageResponseProcessorMock = Mock.ofType(PageResponseProcessor);
        loggerMock = Mock.ofType<GlobalLogger>();

        System.getElapsedTime = () => 100;

        resourceAuthenticator = new ResourceAuthenticator(
            loginPageClientFactoryMock.object,
            pageResponseProcessorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        loginPageClientFactoryMock.verifyAll();
        puppeteerPageMock.verifyAll();
        loginPageClientMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('should return navigation error', async () => {
        const browserError = { statusCode: 404 } as BrowserError;
        const gotoError = new Error('404');
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
            .returns(() => Promise.reject(gotoError))
            .verifiable(Times.atLeastOnce());
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(gotoError))
            .returns(() => browserError)
            .verifiable();
        const authenticationResult = {
            navigationResponse: {
                browserError,
                pageNavigationTiming: {
                    goto: 100,
                },
            } as NavigationResponse,
            authenticationType: 'entraId',
            authenticated: false,
        };

        const response = await resourceAuthenticator.authenticate(url, 'entraId', puppeteerPageMock.object);
        expect(response).toEqual(authenticationResult);
    });

    it('should authenticate resource', async () => {
        const authenticationResult = {
            navigationResponse: { httpResponse: { url: () => 'url' } } as NavigationResponse,
            authenticationType: 'entraId',
            authenticated: true,
        };
        puppeteerGotoResponse = { puppeteerResponse: 'goto', url: () => url } as unknown as Puppeteer.HTTPResponse;
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
            .returns(() => Promise.resolve(puppeteerGotoResponse))
            .verifiable(Times.atLeastOnce());
        loginPageClientMock
            .setup((o) => o.login(puppeteerPageMock.object))
            .returns(() => Promise.resolve(authenticationResult.navigationResponse))
            .verifiable();
        loginPageClientFactoryMock
            .setup((o) => o.getPageClient('entraId'))
            .returns(() => loginPageClientMock.object)
            .verifiable();

        const response = await resourceAuthenticator.authenticate(url, 'entraId', puppeteerPageMock.object);
        expect(response).toEqual(authenticationResult);
    });
});
