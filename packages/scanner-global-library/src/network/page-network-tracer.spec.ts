// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { puppeteerTimeoutConfig } from '../page-timeout-config';
import { PageNetworkTracer } from './page-network-tracer';
import { InterceptedRequest, PageRequestInterceptor } from './page-request-interceptor';

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

    it('handle completed request', async () => {
        setupInterceptedRequests();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);
        const pageOnRequestHandler = (pageNetworkTracer as any).getPageOnRequestHandler();
        const pageOnResponseHandler = (pageNetworkTracer as any).getPageOnResponseHandler();
        await pageOnRequestHandler(interceptedRequests[0]);
        await pageOnResponseHandler(interceptedRequests[0]);

        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { traceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logInfo('[Network] Request completed', {
                    status: 'completed',
                    traceUrl: 'url',
                    httpStatus: '200 OK',
                    serverResponseTiming: '6',
                    data: '{\n  "status": "completed",\n  "url": "url",\n  "httpStatus": "200 OK",\n  "requestHeaders": {\n    "x-request-name": "x-request-value"\n  },\n  "responseHeaders": {\n    "x-response-name": "x-response-value"\n  },\n  "serverResponseTiming": 6\n}',
                }),
            )
            .returns(() => Promise.resolve())
            .verifiable();
    });

    it('handle failed request', async () => {
        setupInterceptedRequests();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);
        const pageOnRequestHandler = (pageNetworkTracer as any).getPageOnRequestHandler();
        const pageOnRequestFailedHandler = (pageNetworkTracer as any).getPageOnRequestFailedHandler();
        await pageOnRequestHandler(interceptedRequests[0]);
        await pageOnRequestFailedHandler(interceptedRequests[0]);

        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { traceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logWarn('[Network] Request failed', {
                    status: 'failed',
                    traceUrl: 'url',
                    httpStatus: '200 OK',
                    serverResponseTiming: '6',
                    data: '{\n  "status": "failed",\n  "url": "url",\n  "httpStatus": "200 OK",\n  "requestHeaders": {\n    "x-request-name": "x-request-value"\n  },\n  "responseHeaders": {\n    "x-response-name": "x-response-value"\n  },\n  "serverResponseTiming": 6\n}',
                }),
            )
            .returns(() => Promise.resolve())
            .verifiable();
    });

    it('trace', async () => {
        let pageOperation: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, puppeteerTimeoutConfig.redirectTimeoutMsec, true))
            .callback(async (fn) => (pageOperation = fn))
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
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

function setupInterceptedRequests(): void {
    const requestHeaders: Record<string, string> = { 'x-request-name': 'x-request-value', authorization: 'should-be-removed' };
    const responseHeaders: Record<string, string> = { 'x-response-name': 'x-response-value' };
    const timing = {
        receiveHeadersEnd: 7,
        sendStart: 1,
    } as Puppeteer.Protocol.Network.ResourceTiming;
    const response = {
        status: () => 200,
        statusText: () => 'OK',
        headers: () => responseHeaders,
        timing: () => timing,
    } as Puppeteer.HTTPResponse;
    const request = {
        url,
        headers: () => requestHeaders,
    } as unknown as Puppeteer.HTTPRequest;
    interceptedRequests = [
        {
            url,
            request,
            response,
        },
    ];
}
