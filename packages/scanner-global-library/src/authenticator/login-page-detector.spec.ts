// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';

import { LoginPageDetector } from './login-page-detector';

let loginPageDetector: LoginPageDetector;
let puppeteerPageMock: IMock<Puppeteer.Page>;

describe(LoginPageDetector, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loginPageDetector = new LoginPageDetector();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
    });

    it('should return MicrosoftAzure client type', () => {
        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => 'https://login.microsoftonline.com/12345-67890/oauth2/authorize?client_id=1')
            .verifiable();

        expect(loginPageDetector.getLoginPageType(puppeteerPageMock.object)).toEqual('MicrosoftAzure');
    });

    it('should skip for unknown URL', () => {
        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => 'https://localhost/')
            .verifiable();

        expect(loginPageDetector.getLoginPageType(puppeteerPageMock.object)).toBeUndefined();
    });

    it('should skip for empty URL', () => {
        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => undefined)
            .verifiable();

        expect(loginPageDetector.getLoginPageType(puppeteerPageMock.object)).toBeUndefined();
    });
});
