// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PageNetworkTracer, PageEventHandler } from './page-network-tracer';
import { MockableLogger } from './test-utilities/mockable-logger';
import { IMock, Mock, It, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';

let loggerMock: IMock<MockableLogger>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let requestMock: IMock<Puppeteer.HTTPRequest>;
let responseMock: IMock<Puppeteer.HTTPResponse>;
let pageNetworkTracer: PageNetworkTracer;

describe(PageNetworkTracer, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        requestMock = Mock.ofType<Puppeteer.HTTPRequest>();
        responseMock = Mock.ofType<Puppeteer.HTTPResponse>();

        pageNetworkTracer = new PageNetworkTracer(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        puppeteerPageMock.verifyAll();
        requestMock.verifyAll();
    });

    it('handle completed request', async () => {
        const pageEventHandlers: PageEventHandler[] = [];
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(true))
            .returns(() => Promise.resolve())
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.on(It.isAny(), It.isAny()))
            .callback(async (name, eventHandler) => {
                pageEventHandlers.push({
                    name,
                    eventHandler,
                });
            })
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            });

        setupRequest();
        await pageNetworkTracer.addNetworkTrace(puppeteerPageMock.object);

        // invoke event handlers
        const requestEventHandler = pageEventHandlers.find((e) => e.name === 'request');
        await requestEventHandler.eventHandler(requestMock.object);
        const requestFinishedEventHandler = pageEventHandlers.find((e) => e.name === 'requestfinished');
        await requestFinishedEventHandler.eventHandler(requestMock.object);

        // validate
        loggerMock
            .setup((o) => o.logInfo('[Network] Enable page network trace'))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { traceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logInfo('[Network] Request completed', {
                    data: '{\n  "status": "completed",\n  "url": "url",\n  "httpStatus": "200 OK",\n  "requestHeaders": {\n    "x-request-name": "x-request-value"\n  },\n  "responseHeaders": {\n    "x-response-name": "x-response-value"\n  },\n  "serverResponseTiming": 6\n}',
                }),
            )
            .returns(() => Promise.resolve())
            .verifiable();
    });

    it('handle failed request', async () => {
        const pageEventHandlers: PageEventHandler[] = [];
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(true))
            .returns(() => Promise.resolve())
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.on(It.isAny(), It.isAny()))
            .callback(async (name, eventHandler) => {
                pageEventHandlers.push({
                    name,
                    eventHandler,
                });
            })
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            });

        setupRequest();
        await pageNetworkTracer.addNetworkTrace(puppeteerPageMock.object);

        // invoke event handlers
        const requestEventHandler = pageEventHandlers.find((e) => e.name === 'request');
        await requestEventHandler.eventHandler(requestMock.object);
        const requestFailedEventHandler = pageEventHandlers.find((e) => e.name === 'requestfailed');
        await requestFailedEventHandler.eventHandler(requestMock.object);

        // validate
        loggerMock
            .setup((o) => o.logInfo('[Network] Enable page network trace'))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) => o.logInfo('[Network] Processing URL', { traceUrl: 'url' }))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logInfo('[Network] Request failed', {
                    data: '{\n  "status": "failed",\n  "url": "url",\n  "httpStatus": "200 OK",\n  "requestHeaders": {\n    "x-request-name": "x-request-value"\n  },\n  "responseHeaders": {\n    "x-response-name": "x-response-value"\n  },\n  "serverResponseTiming": 6\n}',
                }),
            )
            .returns(() => Promise.resolve())
            .verifiable();
    });

    it('add network trace event handlers', async () => {
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(true))
            .returns(() => Promise.resolve())
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.on('request', It.isAny()))
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            })
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.on('requestfinished', It.isAny()))
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            })
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.on('requestfailed', It.isAny()))
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            })
            .verifiable();

        await pageNetworkTracer.addNetworkTrace(puppeteerPageMock.object);
    });

    it('remove network trace event handlers', async () => {
        (pageNetworkTracer as any).networkTraceData = { requests: [] };
        (pageNetworkTracer as any).pageEventHandlers = [{ name: 'request', eventHandler: {} as Puppeteer.EventEmitter }];
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(false))
            .returns(() => Promise.resolve())
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.removeListener('request', It.isAny()))
            .returns(() => {
                return {} as Puppeteer.EventEmitter;
            })
            .verifiable();

        await pageNetworkTracer.removeNetworkTrace(puppeteerPageMock.object);
    });
});

function setupRequest(): void {
    const requestHeaders: Record<string, string> = { 'x-request-name': 'x-request-value' };
    const responseHeaders: Record<string, string> = { 'x-response-name': 'x-response-value' };
    const timing = {
        receiveHeadersEnd: 7,
        sendStart: 1,
    } as Puppeteer.Protocol.Network.ResourceTiming;

    responseMock
        .setup((o) => o.status())
        .returns(() => 200)
        .verifiable();
    responseMock
        .setup((o) => o.statusText())
        .returns(() => 'OK')
        .verifiable();
    responseMock
        .setup((o) => o.headers())
        .returns(() => responseHeaders)
        .verifiable();
    responseMock
        .setup((o) => o.timing())
        .returns(() => timing)
        .verifiable();

    requestMock
        .setup((o) => o.response())
        .returns(() => responseMock.object)
        .verifiable();
    requestMock
        .setup((o) => o.url())
        .returns(() => 'url')
        .verifiable(Times.atLeast(2));
    requestMock
        .setup((o) => o.isInterceptResolutionHandled())
        .returns(() => false)
        .verifiable(Times.atLeast(2));
    requestMock
        .setup((o) => o.continue())
        .returns(() => Promise.resolve())
        .verifiable(Times.atLeast(2));
    requestMock
        .setup((o) => o.headers())
        .returns(() => requestHeaders)
        .verifiable();
}
