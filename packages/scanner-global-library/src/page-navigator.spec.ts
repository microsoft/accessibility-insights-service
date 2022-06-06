// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { Page, HTTPResponse } from 'puppeteer';
import { PageResponseProcessor } from './page-response-processor';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

const url = 'url';

let pageNavigator: PageNavigator;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let navigationHooksMock: IMock<PageNavigationHooks>;
let pageMock: IMock<Page>;
let timingCount: number;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        navigationHooksMock = Mock.ofType<PageNavigationHooks>();
        pageMock = Mock.ofType<Page>();

        timingCount = 0;
        process.hrtime = {
            bigint: () => {
                timingCount += 1;

                return BigInt(timingCount * 10000000000);
            },
        } as NodeJS.HRTime;

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
                    waitUntil: 'networkidle2',
                    timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();
        navigationHooksMock.setup((o) => o.preNavigation(pageMock.object)).verifiable();
        navigationHooksMock.setup((o) => o.postNavigation(pageMock.object, response, onNavigationErrorMock)).verifiable();

        const pageTiming = await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toBeCalledTimes(0);
        expect(pageTiming).toEqual({
            httpResponse: response,
            pageNavigationTiming: {
                goto1: 10000,
                goto2: 0,
            },
        });
    });

    it('navigate with browser error', async () => {
        const error = new Error('navigation error');
        const browserError = {
            errorType: 'NavigationError',
            message: 'navigation error',
        } as BrowserError;
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject(error))
            .verifiable();
        navigationHooksMock.setup((o) => o.preNavigation(pageMock.object)).verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => browserError)
            .verifiable();
        const onNavigationErrorMock = jest.fn();
        onNavigationErrorMock.mockImplementation((browserErr, err) => Promise.resolve());

        await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toHaveBeenCalledWith(browserError, error);
    });

    it('navigate with browser UrlNavigationTimeout() error', async () => {
        const response = {} as HTTPResponse;
        const error = new Error('navigation timeout');
        const browserError = {
            errorType: 'UrlNavigationTimeout',
            message: 'navigation timeout',
        } as BrowserError;
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject(error))
            .verifiable();
        pageMock
            .setup(async (o) =>
                o.goto(url, {
                    waitUntil: 'load',
                    timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => browserError)
            .verifiable();

        const onNavigationErrorMock = jest.fn();
        navigationHooksMock.setup((o) => o.preNavigation(pageMock.object)).verifiable();
        navigationHooksMock.setup((o) => o.postNavigation(pageMock.object, response, onNavigationErrorMock)).verifiable();

        const pageTiming = await pageNavigator.navigate(url, pageMock.object, onNavigationErrorMock);
        expect(onNavigationErrorMock).toBeCalledTimes(0);
        expect(pageTiming).toEqual({
            httpResponse: {},
            pageNavigationTiming: {
                goto1: 10000,
                goto2: 10000,
            },
        });
    });
});
