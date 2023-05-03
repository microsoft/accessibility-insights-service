// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { Page, HTTPResponse } from 'puppeteer';
import { PageResponseProcessor } from './page-response-processor';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageNavigationTiming } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
const scrollTimeoutMsec = 15000;
const pageRenderingTimeoutMsec = 1000;
const pageNavigationTiming: Partial<PageNavigationTiming> = {
    scroll: 1,
    render: 2,
};

let pageConfiguratorMock: IMock<PageConfigurator>;
let pageHandlerMock: IMock<PageHandler>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageMock: IMock<Page>;

let navigationHooks: PageNavigationHooks;

describe(PageNavigationHooks, () => {
    beforeEach(() => {
        pageConfiguratorMock = Mock.ofType<PageConfigurator>();
        pageHandlerMock = Mock.ofType<PageHandler>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageMock = Mock.ofType<Page>();

        navigationHooks = new PageNavigationHooks(
            pageConfiguratorMock.object,
            pageResponseProcessorMock.object,
            pageHandlerMock.object,
            scrollTimeoutMsec,
            pageRenderingTimeoutMsec,
        );
    });

    afterEach(() => {
        pageMock.verifyAll();
        pageHandlerMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageConfiguratorMock.verifyAll();
    });

    it('preNavigation', async () => {
        pageConfiguratorMock.setup((p) => p.configurePage(pageMock.object)).verifiable();
        pageMock
            .setup((o) => o.listenerCount('dialog'))
            .returns(() => 0)
            .verifiable();
        pageMock
            .setup((o) => o.on('dialog', It.isAny()))
            .returns(() => undefined)
            .verifiable();

        await navigationHooks.preNavigation(pageMock.object);
    });

    it('preNavigation call on reenter', async () => {
        pageConfiguratorMock.setup((p) => p.configurePage(pageMock.object)).verifiable();
        pageMock
            .setup((o) => o.listenerCount('dialog'))
            .returns(() => 1)
            .verifiable();
        pageMock
            .setup((o) => o.on('dialog', It.isAny()))
            .returns(() => undefined)
            .verifiable(Times.never());

        await navigationHooks.preNavigation(pageMock.object);
    });

    it('postNavigation with successful response', async () => {
        const response = {} as HTTPResponse;
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => undefined)
            .verifiable();
        pageHandlerMock
            .setup(async (o) => o.waitForPageToCompleteRendering(pageMock.object, scrollTimeoutMsec, pageRenderingTimeoutMsec))
            .returns(() => Promise.resolve(pageNavigationTiming))
            .verifiable();

        const timing = await navigationHooks.postNavigation(pageMock.object, {} as HTTPResponse);
        expect(pageNavigationTiming).toEqual(timing);
    });

    it('postNavigation with undefined response', async () => {
        const expectedError: Partial<BrowserError> = {
            errorType: 'NavigationError',
            message: 'Unable to get a page response from the browser.',
        };

        let navigationError: BrowserError;
        const onNavigationErrorStub = async (browserError: BrowserError, error?: any) => {
            navigationError = browserError;
        };

        await navigationHooks.postNavigation(pageMock.object, undefined, onNavigationErrorStub);
        expect(navigationError).toMatchObject(expectedError);
    });

    it('postNavigation with response error', async () => {
        const response = {} as HTTPResponse;
        const browserError = {
            errorType: 'EmptyPage',
            message: 'message',
            stack: 'stack',
        } as BrowserError;
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(response))
            .returns(() => browserError)
            .verifiable();
        const onNavigationErrorMock = jest.fn();
        onNavigationErrorMock.mockImplementation((browserErr) => Promise.resolve());

        await navigationHooks.postNavigation(pageMock.object, response, onNavigationErrorMock);
        expect(onNavigationErrorMock).toHaveBeenCalledWith(browserError);
    });
});
