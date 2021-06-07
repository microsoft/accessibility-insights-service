// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { Page, Response } from 'puppeteer';
import { PageResponseProcessor } from './page-response-processor';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
const url = 'url';

let pageNavigator: PageNavigator;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageConfiguratorMock: IMock<PageConfigurator>;
let pageRenderingHandlerMock: IMock<PageHandler>;
let pageMock: IMock<Page>;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageConfiguratorMock = Mock.ofType<PageConfigurator>();
        pageRenderingHandlerMock = Mock.ofType(PageHandler);
        pageMock = Mock.ofType<Page>();

        pageNavigator = new PageNavigator(pageConfiguratorMock.object, pageResponseProcessorMock.object, pageRenderingHandlerMock.object);
    });

    afterEach(() => {
        pageRenderingHandlerMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageConfiguratorMock.verifyAll();
    });

    it('navigate', async () => {
        const response = {} as Response;
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: pageNavigator.gotoTimeoutMsecs,
                }),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();
        pageConfiguratorMock
            .setup(async (o) => o.configurePage(pageMock.object))
            .returns(() => Promise.resolve())
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => undefined)
            .verifiable();
        pageRenderingHandlerMock
            .setup(async (o) => o.waitForPageToCompleteRendering(pageMock.object, pageNavigator.pageRenderingTimeoutMsecs))
            .returns(() => Promise.resolve())
            .verifiable();

        await pageNavigator.navigate(url, pageMock.object);
    });

    it('navigate with timeout', async () => {
        const timeoutError = new Error('navigation timeout');
        const browserError = {
            errorType: 'NavigationError',
            message: timeoutError.message,
            stack: 'stack',
        } as BrowserError;
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: pageNavigator.gotoTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject(timeoutError))
            .verifiable();
        pageConfiguratorMock
            .setup(async (o) => o.configurePage(pageMock.object))
            .returns(() => Promise.resolve())
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(timeoutError))
            .returns(() => browserError)
            .verifiable();
        const onNavigationErrorMock = jest.fn();
        onNavigationErrorMock.mockImplementation((browserErr, err) => Promise.resolve());

        await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toHaveBeenCalledWith(browserError, timeoutError);
    });

    it('navigate with response error', async () => {
        const response = {} as Response;
        const browserError = {
            errorType: 'EmptyPage',
            message: 'message',
            stack: 'stack',
        } as BrowserError;
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: pageNavigator.gotoTimeoutMsecs,
                }),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();
        pageConfiguratorMock
            .setup(async (o) => o.configurePage(pageMock.object))
            .returns(() => Promise.resolve())
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => browserError)
            .verifiable();
        const onNavigationErrorMock = jest.fn();
        onNavigationErrorMock.mockImplementation((browserErr) => Promise.resolve());

        await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toHaveBeenCalledWith(browserError);
    });
});
