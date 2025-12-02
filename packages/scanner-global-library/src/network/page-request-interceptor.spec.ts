// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { PageRequestInterceptor, PuppeteerPageExt } from './page-request-interceptor';
import { PageNetworkTracerHandler } from './page-network-tracer-handler';
import { InterceptedRequest } from './page-event-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

let pageRequestInterceptor: PageRequestInterceptor;
let puppeteerPageMock: IMock<PuppeteerPageExt>;
let loggerMock: IMock<GlobalLogger>;
let pageNetworkTracerHandlerMock: IMock<PageNetworkTracerHandler>;

const mainFrame = { name: () => 'main' } as Puppeteer.Frame;

describe(PageRequestInterceptor, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loggerMock = Mock.ofType(GlobalLogger);
        pageNetworkTracerHandlerMock = Mock.ofType<PageNetworkTracerHandler>();

        pageRequestInterceptor = new PageRequestInterceptor(pageNetworkTracerHandlerMock.object, loggerMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
        pageNetworkTracerHandlerMock.verifyAll();
    });

    it('should invoke pageOnRequest', async () => {
        const request = {
            url: () => 'url',
            isNavigationRequest: () => true,
            frame: () => mainFrame,
            continue: () => Promise.resolve(),
            isInterceptResolutionHandled: () => false,
            _interceptionId: 'interceptionId-1',
        };
        puppeteerPageMock
            .setup((o) => o.mainFrame())
            .returns(() => mainFrame)
            .verifiable();
        const pageOnRequest = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequest = pageOnRequest;

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        await (pageRequestInterceptor as any).pageOnRequestEventHandler(request);

        expect(pageOnRequest).toBeCalledWith({ url: 'url', interceptionId: 'interceptionId-1', request });
        expect(pageRequestInterceptor.interceptedRequests).toEqual([{ url: 'url', interceptionId: 'interceptionId-1', request }]);
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

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        pageRequestInterceptor.networkTraceEnabled = true;
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
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
            _interceptionId: 'interceptionId-1',
        } as unknown as Puppeteer.HTTPRequest;
        const response = {
            url: () => 'url',
            request: () => {
                return { _interceptionId: 'interceptionId-1' };
            },
        };
        const interceptedRequest = { url: request.url(), interceptionId: 'interceptionId-1', request } as InterceptedRequest;

        const pageOnResponse = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnResponse = pageOnResponse;

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnResponseEventHandler(response);

        expect(pageOnResponse).toBeCalledWith(pageRequestInterceptor.interceptedRequests[0]);
        expect(pageRequestInterceptor.interceptedRequests).toEqual([{ url: 'url', interceptionId: 'interceptionId-1', request, response }]);
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

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        pageRequestInterceptor.networkTraceEnabled = true;
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
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
            _interceptionId: 'interceptionId-1',
        } as unknown as Puppeteer.HTTPRequest;
        const interceptedRequest = { url: request.url(), interceptionId: 'interceptionId-1', request } as InterceptedRequest;

        const pageOnRequestFailed = jest.fn().mockImplementation(async () => Promise.resolve());
        pageRequestInterceptor.pageOnRequestFailed = pageOnRequestFailed;

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnRequestFailedEventHandler(request);

        expect(pageOnRequestFailed).toBeCalledWith(pageRequestInterceptor.interceptedRequests[0]);
        expect(pageRequestInterceptor.interceptedRequests).toEqual([
            { url: 'url', interceptionId: 'interceptionId-1', error: 'errorText', request },
        ]);
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

        pageRequestInterceptor.errors = [];
        pageRequestInterceptor.interceptedRequests = [];
        pageRequestInterceptor.networkTraceEnabled = true;
        await pageRequestInterceptor.enableInterception(puppeteerPageMock.object);
        pageRequestInterceptor.interceptedRequests = [interceptedRequest];
        await (pageRequestInterceptor as any).pageOnRequestFailedEventHandler(request);

        expect(traceRequestHandler).toBeCalledWith(interceptedRequest);
    });

    it('should enable interception', async () => {
        puppeteerPageMock
            .setup((o) => o.setBypassServiceWorker(true))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
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
});
