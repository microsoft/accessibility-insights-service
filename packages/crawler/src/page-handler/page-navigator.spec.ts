// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { Logger } from '../logger/logger';
import { PageNavigator, PageOperationResult, NavigationResponse } from './page-navigator';
import { PageNavigationHooks } from './page-navigation-hooks';
import { puppeteerTimeoutConfig } from './page-timeout-config';
import { BrowserError } from './browser-error';
import { PageResponseProcessor } from './page-response-processor';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

const url = 'url';
const waitForOptions: Puppeteer.WaitForOptions = {
    waitUntil: 'networkidle2',
    timeout: puppeteerTimeoutConfig.navigationTimeoutMsec,
};

let pageNavigator: PageNavigator;
let pageNavigationHooksMock: IMock<PageNavigationHooks>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let loggerMock: IMock<Logger>;
let pageOperationResult: PageOperationResult;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageNavigationHooksMock = Mock.ofType<PageNavigationHooks>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        loggerMock = Mock.ofType(Logger);
        pageOperationResult = {} as PageOperationResult;

        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            if (typeof callback === 'function') {
                callback();
            }

            return { hasRef: () => false } as NodeJS.Timeout;
        });

        pageNavigator = new PageNavigator(pageNavigationHooksMock.object, pageResponseProcessorMock.object, loggerMock.object);
    });

    afterEach(() => {
        pageNavigationHooksMock.verifyAll();
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
    });

    describe('navigate', () => {
        it('navigate to url', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            pageNavigationHooksMock
                .setup((o) => o.postNavigation(puppeteerPageMock.object, pageOperationResult.response, It.isAny()))
                .returns(() => Promise.resolve())
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.goto(url, waitForOptions))
                .returns(() => Promise.resolve(pageOperationResult.response))
                .verifiable();

            const expectedResponse = {
                httpResponse: pageOperationResult.response,
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
        });

        it('navigate to url with navigation error', async () => {
            pageOperationResult.error = new Error('error');
            pageOperationResult.browserError = { errorType: 'SslError' } as BrowserError;
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.goto(url, waitForOptions))
                .returns(() => Promise.reject(pageOperationResult.error))
                .verifiable();
            pageResponseProcessorMock
                .setup((o) => o.getNavigationError(pageOperationResult.error as Error))
                .returns(() => pageOperationResult.browserError)
                .verifiable();

            const expectedResponse = {
                browserError: pageOperationResult.browserError,
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
        });

        it('navigate to url with server response error', async () => {
            const browserError = { errorType: 'NavigationError' } as BrowserError;
            pageOperationResult.response = {
                status: () => 500,
            } as Puppeteer.HTTPResponse;
            puppeteerPageMock
                .setup((o) => o.goto(url, waitForOptions))
                .returns(() => Promise.resolve(pageOperationResult.response))
                .verifiable();
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();

            let callbackFn: any;
            pageNavigationHooksMock
                .setup((o) => o.postNavigation(puppeteerPageMock.object, pageOperationResult.response, It.isAny()))
                .callback((p, r, f) => (callbackFn = f))
                .returns(async () => callbackFn(browserError))
                .verifiable();

            const expectedResponse = {
                httpResponse: pageOperationResult.response,
                browserError,
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
        });
    });
});
