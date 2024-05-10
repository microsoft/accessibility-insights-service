// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { PuppeteerTimeoutConfig } from '../page-timeout-config';
import { PageRequestInterceptor } from './page-request-interceptor';
import { InterceptedRequest } from './page-event-handler';
import { PageNetworkTracer } from './page-network-tracer';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';

let interceptedRequests: InterceptedRequest[];
let loggerMock: IMock<MockableLogger>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let pageRequestInterceptorMock: IMock<PageRequestInterceptor>;
let pageNetworkTracer: PageNetworkTracer;
let puppeteerGotoResponse: Puppeteer.HTTPResponse;

describe(PageNetworkTracer, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        pageRequestInterceptorMock = Mock.ofType<PageRequestInterceptor>();

        interceptedRequests = [];
        puppeteerGotoResponse = {} as Puppeteer.HTTPResponse;

        pageNetworkTracer = new PageNetworkTracer(pageRequestInterceptorMock.object, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        puppeteerPageMock.verifyAll();
        pageRequestInterceptorMock.verifyAll();
    });

    it('trace', async () => {
        let pageOperation: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec, true))
            .callback(async (fn) => (pageOperation = fn))
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec }))
            .returns(() => Promise.resolve(puppeteerGotoResponse))
            .verifiable();

        await pageNetworkTracer.trace(url, puppeteerPageMock.object);
        loggerMock
            .setup((o) => o.logInfo('[Network] Enable page network trace'))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) => o.logInfo('[Network] Disable page network trace'))
            .returns(() => Promise.resolve())
            .verifiable();
    });
});
