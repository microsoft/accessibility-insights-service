// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { PageResponseProcessor } from '../page-response-processor';
import { BrowserError } from '../browser-error';
import { PageNavigationTiming, PuppeteerTimeoutConfig } from '../page-timeout-config';
import { PageOperationHandler, PageOperation } from './page-operation-handler';
import { PageRequestInterceptor } from './page-request-interceptor';
import { InterceptedRequest } from './page-event-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';
const navigationTimeoutMsec = 10;

let pageOperationHandler: PageOperationHandler;
let interceptedRequests: InterceptedRequest[];
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<GlobalLogger>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageRequestInterceptorMock: IMock<PageRequestInterceptor>;
let puppeteerTimeoutConfigMock: IMock<PuppeteerTimeoutConfig>;
let pageOperation: PageOperation;
let response: Puppeteer.HTTPResponse;

describe(PageOperationHandler, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loggerMock = Mock.ofType<GlobalLogger>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageRequestInterceptorMock = Mock.ofType<PageRequestInterceptor>();
        puppeteerTimeoutConfigMock = Mock.ofType<PuppeteerTimeoutConfig>();

        puppeteerTimeoutConfigMock
            .setup((o) => o.navigationTimeoutMsec)
            .returns(() => navigationTimeoutMsec)
            .verifiable();

        interceptedRequests = [];
        System.getElapsedTime = () => 100;

        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            if (typeof callback === 'function') {
                callback();
            }

            return { hasRef: () => false } as NodeJS.Timeout;
        });

        let callbackFn: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, navigationTimeoutMsec))
            .callback(async (fn) => (callbackFn = fn))
            .returns(async () => callbackFn(url, puppeteerPageMock.object))
            .verifiable();

        pageOperationHandler = new PageOperationHandler(
            pageRequestInterceptorMock.object,
            pageResponseProcessorMock.object,
            puppeteerTimeoutConfigMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageRequestInterceptorMock.verifyAll();
        puppeteerTimeoutConfigMock.verifyAll();
    });

    it('return when no request timeout error', async () => {
        response = {
            url: () => url,
        } as Puppeteer.HTTPResponse;
        pageOperation = () => Promise.resolve(response);
        const expectedResponse = {
            response,
            navigationTiming: { goto: 100 } as PageNavigationTiming,
        };

        const actualResponse = await pageOperationHandler.invoke(pageOperation, puppeteerPageMock.object);
        expect(actualResponse).toEqual(expectedResponse);
    });

    it('override when request timeout', async () => {
        response = {
            url: () => url,
        } as Puppeteer.HTTPResponse;
        interceptedRequests = [
            {
                response: {},
            } as InterceptedRequest,
            {
                response,
            } as InterceptedRequest,
        ];
        const error = new Error('timeout');
        pageOperation = () => Promise.reject(error);
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => ({ errorType: 'UrlNavigationTimeout' } as BrowserError))
            .verifiable();
        pageRequestInterceptorMock
            .setup((o) => o.interceptedRequests)
            .returns(() => interceptedRequests)
            .verifiable();
        const expectedResponse = {
            response,
            navigationTiming: { goto: 100, gotoTimeout: true } as PageNavigationTiming,
        };

        const actualResponse = await pageOperationHandler.invoke(pageOperation, puppeteerPageMock.object);
        expect(actualResponse).toEqual(expectedResponse);
    });

    it('override when indirect redirect', async () => {
        response = {
            url: () => url,
        } as Puppeteer.HTTPResponse;
        interceptedRequests = [
            {
                response: {},
            } as InterceptedRequest,
            {
                response,
            } as InterceptedRequest,
        ];
        pageOperation = () => Promise.resolve(undefined);
        pageRequestInterceptorMock
            .setup((o) => o.interceptedRequests)
            .returns(() => interceptedRequests)
            .verifiable(Times.exactly(2));
        const expectedResponse = {
            response,
            navigationTiming: { goto: 100 } as PageNavigationTiming,
        };

        const actualResponse = await pageOperationHandler.invoke(pageOperation, puppeteerPageMock.object);
        expect(actualResponse).toEqual(expectedResponse);
    });
});
