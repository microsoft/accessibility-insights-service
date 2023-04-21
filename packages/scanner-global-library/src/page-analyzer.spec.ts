// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { PageAnalyzer } from './page-analyzer';
import { PageResponseProcessor } from './page-response-processor';
import { LoginPageDetector } from './authenticator/login-page-detector';
import { PageNavigationTiming, puppeteerTimeoutConfig } from './page-timeout-config';
import { PageOperationResult } from './page-navigator';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url-1';
const authUrl = 'url-2';

let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<GlobalLogger>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let loginPageDetectorMock: IMock<LoginPageDetector>;
let pageAnalyzer: PageAnalyzer;
let pageOperationResult: PageOperationResult;
let puppeteerGotoResponse: Puppeteer.HTTPResponse;

describe(PageAnalyzer, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType(Puppeteer.Page);
        loggerMock = Mock.ofType(GlobalLogger);
        pageResponseProcessorMock = Mock.ofType(PageResponseProcessor);
        loginPageDetectorMock = Mock.ofType(LoginPageDetector);

        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            if (typeof callback === 'function') {
                callback();
            }

            return { hasRef: () => false } as NodeJS.Timeout;
        });
        System.getElapsedTime = () => 1000;

        puppeteerGotoResponse = {} as Puppeteer.HTTPResponse;
        pageOperationResult = { response: puppeteerGotoResponse, navigationTiming: { goto1: 1000 } as PageNavigationTiming };
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(true))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(false))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
            .returns(() => Promise.resolve(puppeteerGotoResponse))
            .verifiable(Times.atLeastOnce());

        pageAnalyzer = new PageAnalyzer(pageResponseProcessorMock.object, loginPageDetectorMock.object, loggerMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        loginPageDetectorMock.verifyAll();
    });

    it('detect no page redirection', async () => {
        puppeteerPageMock
            .setup((o) => o.on('request', It.isAny()))
            .returns(() => undefined)
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.off('request', It.isAny()))
            .returns(() => undefined)
            .verifiable();

        const actualResult = await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        const expectedResult = {
            redirection: false,
            authentication: false,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });

    it('detect page redirection and authentication', async () => {
        let pageOnRequestEventHandler: (request: Puppeteer.HTTPRequest) => Promise<void>;
        const request = {
            url: () => authUrl,
            isNavigationRequest: () => true,
            redirectChain: () => [{}],
            continue: () => Promise.resolve(),
        } as unknown as Puppeteer.HTTPRequest;

        loginPageDetectorMock
            .setup((o) => o.getLoginPageType(authUrl))
            .returns(() => 'MicrosoftAzure')
            .verifiable();

        // mock to get event handler
        puppeteerPageMock
            .setup((o) => o.on('request', It.isAny()))
            .callback((name, handler) => {
                if (pageOnRequestEventHandler === undefined) {
                    pageOnRequestEventHandler = handler;
                }
            })
            .returns(() => undefined);
        puppeteerPageMock.setup((o) => o.off('request', It.isAny())).returns(() => undefined);
        // call to get event handler from callback() above
        await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        // run test
        const actualResult = await Promise.all([pageAnalyzer.analyze(url, puppeteerPageMock.object), pageOnRequestEventHandler(request)]);

        const expectedResult = {
            redirection: true,
            authentication: true,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult[0]).toEqual(expectedResult);
    });
});
