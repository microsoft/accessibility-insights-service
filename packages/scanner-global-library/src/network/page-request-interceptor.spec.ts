// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { PageRequestInterceptor } from './page-request-interceptor';
import { PageNetworkTracerHandler } from './page-network-tracer-handler';
import { InterceptedRequest } from './page-event-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

let pageRequestInterceptor: PageRequestInterceptor;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<GlobalLogger>;
let cdpSessionMock: IMock<Puppeteer.CDPSession>;
let pageNetworkTracerHandlerMock: IMock<PageNetworkTracerHandler>;
let puppeteerTargetMock: IMock<Puppeteer.Target>;

const mainFrame = { name: () => 'main' } as Puppeteer.Frame;

describe(PageRequestInterceptor, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loggerMock = Mock.ofType(GlobalLogger);
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
        pageNetworkTracerHandlerMock = Mock.ofType<PageNetworkTracerHandler>();
        puppeteerTargetMock = Mock.ofType<Puppeteer.Target>();

        setupEnableBypassServiceWorker();

        pageRequestInterceptor = new PageRequestInterceptor(pageNetworkTracerHandlerMock.object, loggerMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
        cdpSessionMock.verifyAll();
        pageNetworkTracerHandlerMock.verifyAll();
        puppeteerTargetMock.verifyAll();
    });

    it('should invoke pageOnRequest', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
        };
        puppeteerPageMock
            .setup((o) => o.mainFrame())
            .returns(() => mainFrame)
            .verifiable();
        const pageOnRequest = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequest = pageOnRequest;

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        await (pageRequestInterceptor as any).pageOnRequestEventHandler(request);

        expect(pageOnRequest).toBeCalledWith({ url: 'url', request });
        expect(pageRequestInterceptor.interceptedRequests).toEqual([{ url: 'url', request }]);
        expect(pageRequestInterceptor.errors).toEqual([]);
    });

    it('should invoke pageOnRequest with network trace', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
        };
        const pageOnRequest = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequest = pageOnRequest;

        const traceRequestHandler = jest.fn().mockImplementation(async () => Promise.resolve());
        pageNetworkTracerHandlerMock
            .setup((o) => o.getPageOnRequestHandler())
            .returns(() => traceRequestHandler)
            .verifiable();

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object, true);
        await (pageRequestInterceptor as any).pageOnRequestEventHandler(request);

        expect(traceRequestHandler).toBeCalledWith({ url: 'url', request });
    });

    it('should invoke pageOnResponse', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
        };
        const response = {
            url: () => 'url',
        };
        const interceptedRequest = { url: request.url(), request } as InterceptedRequest;

        const pageOnResponse = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnResponse = pageOnResponse;

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnResponseEventHandler(response);

        expect(pageOnResponse).toBeCalledWith(pageRequestInterceptor.interceptedRequests[0]);
        expect(pageRequestInterceptor.interceptedRequests).toEqual([{ url: 'url', request, response }]);
        expect(pageRequestInterceptor.errors).toEqual([]);
    });

    it('should invoke pageOnResponse with network trace', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
        };
        const response = {
            url: () => 'url',
        };
        const interceptedRequest = { url: request.url(), request } as InterceptedRequest;

        const pageOnResponse = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnResponse = pageOnResponse;

        const traceRequestHandler = jest.fn().mockImplementation(async () => Promise.resolve());
        pageNetworkTracerHandlerMock
            .setup((o) => o.getPageOnResponseHandler())
            .returns(() => traceRequestHandler)
            .verifiable();

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object, true);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnResponseEventHandler(response);

        expect(traceRequestHandler).toBeCalledWith(interceptedRequest);
    });

    it('should invoke pageOnRequestFailed', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
            failure: () => ({
                errorText: 'errorText',
            }),
        };
        const interceptedRequest = { url: request.url(), request } as InterceptedRequest;

        const pageOnRequestFailed = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequestFailed = pageOnRequestFailed;

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnRequestFailedEventHandler(request);

        expect(pageOnRequestFailed).toBeCalledWith(pageRequestInterceptor.interceptedRequests[0]);
        expect(pageRequestInterceptor.interceptedRequests).toEqual([{ url: 'url', error: 'errorText', request }]);
        expect(pageRequestInterceptor.errors).toEqual([]);
    });

    it('should invoke pageOnRequestFailed with network trace', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
            failure: () => ({
                errorText: 'errorText',
            }),
        };
        const interceptedRequest = { url: request.url(), request } as InterceptedRequest;

        const pageOnRequestFailed = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequestFailed = pageOnRequestFailed;

        const traceRequestHandler = jest.fn().mockImplementation(async () => Promise.resolve());
        pageNetworkTracerHandlerMock
            .setup((o) => o.getPageOnRequestFailedHandler())
            .returns(() => traceRequestHandler)
            .verifiable();

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object, true);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnRequestFailedEventHandler(request);

        expect(traceRequestHandler).toBeCalledWith(interceptedRequest);
    });

    it('should enable interception', async () => {
        puppeteerPageMock
            .setup((o) => o.setRequestInterception(true))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.on('request', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.on('response', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.on('requestfailed', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
    });

    it('should disable interception', async () => {
        puppeteerPageMock
            .setup((o) => o.off('request', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.off('response', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.off('requestfailed', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.atLeastOnce());

        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        await pageRequestInterceptor.disableInterception(puppeteerPageMock.object);
    });
});

function setupEnableBypassServiceWorker(): void {
    puppeteerPageMock
        .setup((o) => o.target())
        .returns(() => puppeteerTargetMock.object)
        .verifiable();
    cdpSessionMock
        .setup((o) => o.send('Network.enable'))
        .returns(() => Promise.resolve())
        .verifiable();
    cdpSessionMock
        .setup((o) => o.send('Network.setBypassServiceWorker', { bypass: true }))
        .returns(() => Promise.resolve())
        .verifiable();
    puppeteerTargetMock
        .setup((o) => o.createCDPSession())
        .returns(() => Promise.resolve(cdpSessionMock.object))
        .verifiable();
}
