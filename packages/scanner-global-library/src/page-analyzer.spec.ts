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

const url = 'https://localhost/';
const authUrl = 'https://auth/';

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
        System.getElapsedTime = () => 100;
        puppeteerTimeoutConfig.redirectTimeoutMsecs = 100;

        puppeteerGotoResponse = {} as Puppeteer.HTTPResponse;
        pageOperationResult = { response: puppeteerGotoResponse, navigationTiming: { goto1: 100 } as PageNavigationTiming };
        puppeteerPageMock.setup((o) => o.mainFrame()).returns(() => 'mainFrame' as unknown as Puppeteer.Frame);
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

    it('no redirection', async () => {
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

    it('indirect redirection to authentication', async () => {
        const request = {
            url: () => authUrl,
            isNavigationRequest: () => true,
            frame: () => 'mainFrame',
            continue: () => Promise.resolve(),
        };
        const response = {
            url: () => authUrl,
            status: () => 200,
            headers: () => ({}),
        };

        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => authUrl)
            .verifiable(Times.atLeastOnce());
        loginPageDetectorMock
            .setup((o) => o.getLoginPageType(authUrl))
            .returns(() => 'MicrosoftAzure')
            .verifiable(Times.atLeastOnce());

        // run test
        const actualResult = await runAnalyze([request], [response]);

        const expectedResult = {
            redirection: true,
            authentication: true,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });

    it('ignore server redirection', async () => {
        const request1 = {
            url: () => 'https://localhost/1',
            isNavigationRequest: () => true,
            frame: () => 'mainFrame',
            continue: () => Promise.resolve(),
        };
        const response1 = {
            url: () => 'https://localhost/1',
            status: () => 302,
            headers: () => ({ location: 'https://localhost/2' }),
        };
        const request2 = {
            ...request1,
            url: () => 'https://localhost/2',
        };
        const response2 = {
            url: () => 'https://localhost/2',
            status: () => 302,
            headers: () => ({ location: 'https://localhost/1' }),
        };

        // run test
        const actualResult = await runAnalyze([request1, request2], [response1, response2]);

        const expectedResult = {
            redirection: false,
            authentication: false,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });
});

async function runAnalyze(requests: any[], responses: any[]): Promise<any> {
    let pageOnRequestEventHandler: (request: any) => Promise<void>;
    let pageOnResponseEventHandler: (response: any) => Promise<void>;

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

    puppeteerPageMock
        .setup((o) => o.on('response', It.isAny()))
        .callback((name, handler) => {
            if (pageOnResponseEventHandler === undefined) {
                pageOnResponseEventHandler = handler;
            }
        })
        .returns(() => undefined);
    puppeteerPageMock.setup((o) => o.off('response', It.isAny())).returns(() => undefined);

    // call to get event handler from callback() above
    await pageAnalyzer.analyze(url, puppeteerPageMock.object);

    // run test
    const results = await Promise.all([
        pageAnalyzer.analyze(url, puppeteerPageMock.object),
        requests.map(pageOnRequestEventHandler),
        responses.map(pageOnResponseEventHandler),
    ]);

    return results[0];
}
