// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { PageRequestInterceptor } from './page-request-interceptor';
import { InterceptedRequest } from './page-event-handler';
import { PageNetworkTracerHandler } from './page-network-tracer-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';

let interceptedRequests: InterceptedRequest[];
let loggerMock: IMock<MockableLogger>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let pageRequestInterceptorMock: IMock<PageRequestInterceptor>;
let pageNetworkTracerHandler: PageNetworkTracerHandler;

describe(PageNetworkTracerHandler, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        pageRequestInterceptorMock = Mock.ofType<PageRequestInterceptor>();
        pageNetworkTracerHandler = new PageNetworkTracerHandler(loggerMock.object);

        interceptedRequests = [];

        pageNetworkTracerHandler = new PageNetworkTracerHandler(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        puppeteerPageMock.verifyAll();
        pageRequestInterceptorMock.verifyAll();
    });

    it('handle completed request', async () => {
        setupInterceptedRequests();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);
        const pageOnRequestHandler = pageNetworkTracerHandler.getPageOnRequestHandler();
        const pageOnResponseHandler = pageNetworkTracerHandler.getPageOnResponseHandler();
        await pageOnRequestHandler(interceptedRequests[0]);
        await pageOnResponseHandler(interceptedRequests[0]);

        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { networkTraceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logInfo('[Network] Request completed', {
                    status: 'completed',
                    networkTraceUrl: 'url',
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
        const pageOnRequestHandler = pageNetworkTracerHandler.getPageOnRequestHandler();
        const pageOnRequestFailedHandler = pageNetworkTracerHandler.getPageOnRequestFailedHandler();
        await pageOnRequestHandler(interceptedRequests[0]);
        await pageOnRequestFailedHandler(interceptedRequests[0]);

        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { networkTraceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logWarn('[Network] Request failed', {
                    status: 'failed',
                    networkTraceUrl: 'url',
                    httpStatus: '200 OK',
                    serverResponseTiming: '6',
                    data: '{\n  "status": "failed",\n  "url": "url",\n  "httpStatus": "200 OK",\n  "requestHeaders": {\n    "x-request-name": "x-request-value"\n  },\n  "responseHeaders": {\n    "x-response-name": "x-response-value"\n  },\n  "serverResponseTiming": 6\n}',
                }),
            )
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
