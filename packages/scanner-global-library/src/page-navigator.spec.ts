// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Page, HTTPResponse } from 'puppeteer';
import { PageResponseProcessor } from './page-response-processor';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';
import { NavigationHooks } from './navigation-hooks';
import { PageConfigurator } from './page-configurator';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
const url = 'url';

let pageNavigator: PageNavigator;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let navigationHooksMock: IMock<NavigationHooks>;
let pageMock: IMock<Page>;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        navigationHooksMock = Mock.ofType<NavigationHooks>();
        pageMock = Mock.ofType<Page>();

        pageNavigator = new PageNavigator(pageResponseProcessorMock.object, navigationHooksMock.object);
    });

    afterEach(() => {
        pageResponseProcessorMock.verifyAll();
        navigationHooksMock.verifyAll();
    });

    it('get pageConfigurator', () => {
        const pageConfiguratorMock = Mock.ofType<PageConfigurator>();
        navigationHooksMock.setup((o) => o.pageConfigurator).returns(() => pageConfiguratorMock.object);

        expect(pageNavigator.pageConfigurator).toBe(pageConfiguratorMock.object);
    });

    it('navigate', async () => {
        const response = {} as HTTPResponse;
        const onNavigationErrorMock = jest.fn();

        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: pageNavigator.gotoTimeoutMsecs,
                }),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();
        navigationHooksMock.setup((o) => o.preNavigation(pageMock.object)).verifiable();
        navigationHooksMock.setup((o) => o.postNavigation(pageMock.object, response, onNavigationErrorMock)).verifiable();

        await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);

        expect(onNavigationErrorMock).toBeCalledTimes(0);
    });

    it('navigate with timeout', async () => {
        const timeoutError = new Error('navigation timeout');
        const browserError = {
            errorType: 'UrlNavigationTimeout',
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
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'load',
                    timeout: pageNavigator.gotoTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject(timeoutError))
            .verifiable();
        navigationHooksMock.setup((o) => o.preNavigation(pageMock.object)).verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(timeoutError))
            .returns(() => browserError)
            .verifiable(Times.exactly(2));
        const onNavigationErrorMock = jest.fn();
        onNavigationErrorMock.mockImplementation((browserErr, err) => Promise.resolve());

        await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toHaveBeenCalledWith(browserError, timeoutError);
    });
});
