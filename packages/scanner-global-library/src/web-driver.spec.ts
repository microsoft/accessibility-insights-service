// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ChildProcess } from 'child_process';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times, MockBehavior } from 'typemoq';
import { PromiseUtils } from 'common';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra, { PuppeteerExtraPlugin } from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MockableLogger } from './test-utilities/mockable-logger';
import { WebDriver } from './web-driver';
import { StealthPluginType } from './stealth-plugin-type';
import { UserAgentPlugin } from './user-agent-plugin';
import { BrowserCache } from './browser-cache';

/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any*/

class PuppeteerBrowserMock {
    public isClosed: boolean;

    public browserPages: Puppeteer.Page[];

    public childProcess: ChildProcess;

    public async close(): Promise<void> {
        this.isClosed = true;

        return Promise.resolve();
    }

    public async userAgent(): Promise<string> {
        return 'HeadlessChrome user agent string';
    }

    public process(): ChildProcess {
        return this.childProcess;
    }

    public async pages(): Promise<Puppeteer.Page[]> {
        return this.browserPages;
    }
}

let testSubject: WebDriver;
let loggerMock: IMock<MockableLogger>;
let puppeteerBrowserMock: PuppeteerBrowserMock;
let promiseUtilsMock: IMock<PromiseUtils>;
let puppeteerExtraMock: IMock<typeof PuppeteerExtra>;
let userAgentPluginMock: IMock<UserAgentPlugin>;
let browserCacheMock: IMock<BrowserCache>;

beforeEach(() => {
    puppeteerBrowserMock = new PuppeteerBrowserMock();
    promiseUtilsMock = Mock.ofType<PromiseUtils>();
    puppeteerExtraMock = Mock.ofType<typeof PuppeteerExtra>();
    userAgentPluginMock = Mock.ofType<UserAgentPlugin>();
    browserCacheMock = Mock.ofType<BrowserCache>();
    loggerMock = Mock.ofType(MockableLogger);
    testSubject = new WebDriver(
        promiseUtilsMock.object,
        userAgentPluginMock.object,
        browserCacheMock.object,
        loggerMock.object,
        Puppeteer,
        puppeteerExtraMock.object,
        StealthPlugin(),
    );
});

afterEach(() => {
    browserCacheMock.verifyAll();
});

describe('WebDriver', () => {
    describe('close', () => {
        let pageMock: IMock<Puppeteer.Page>;
        let browserProcessMock: IMock<ChildProcess>;

        beforeEach(() => {
            process.env.MOD_HTTP_HEADER = undefined;
            pageMock = Mock.ofType<Puppeteer.Page>();
            puppeteerBrowserMock.browserPages = [pageMock.object];

            browserProcessMock = Mock.ofInstance({ kill: () => null } as ChildProcess, MockBehavior.Strict);
            puppeteerBrowserMock.childProcess = browserProcessMock.object;
        });

        afterEach(() => {
            promiseUtilsMock.verifyAll();
            puppeteerExtraMock.verifyAll();
        });

        it('should close puppeteer browser', async () => {
            setupPromiseUtils(false);
            puppeteerExtraMock
                .setup((o) => o.launch(It.isAny()))
                .returns(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
                .verifiable(Times.once());
            pageMock
                .setup((p) => p.close())
                .returns(() => Promise.resolve())
                .verifiable();

            await testSubject.launch();
            await testSubject.close();

            expect(puppeteerBrowserMock.isClosed).toEqual(true);
        });

        it('should do nothing if close times out and browser process is not found', async () => {
            setupPromiseUtils(true);
            puppeteerBrowserMock.childProcess = undefined;
            puppeteerExtraMock
                .setup((o) => o.launch(It.isAny()))
                .returns(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
                .verifiable(Times.once());

            await testSubject.launch();
            await testSubject.close();
        });
    });

    it('should launch puppeteer browser', async () => {
        const userAgentPlugin = { name: 'user-agent-plugin' } as unknown as PuppeteerExtraPlugin;
        const stealthAgentPlugin = { name: 'stealth' } as unknown as PuppeteerExtraPlugin;
        puppeteerExtraMock
            .setup((o) => o.use(It.isObjectWith(userAgentPlugin)))
            .returns(() => puppeteerExtraMock.object)
            .verifiable();
        puppeteerExtraMock
            .setup((o) => o.use(It.isObjectWith(stealthAgentPlugin)))
            .returns(() => puppeteerExtraMock.object)
            .verifiable();
        puppeteerExtraMock
            .setup((o) => o.launch(It.isAny()))
            .returns(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());

        const browser = await testSubject.launch();

        expect(browser).toEqual(puppeteerBrowserMock);
    });

    it('should clean browser cache', async () => {
        puppeteerExtraMock
            .setup((o) => o.use(It.isAny()))
            .returns(() => puppeteerExtraMock.object)
            .verifiable();
        puppeteerExtraMock
            .setup((o) => o.launch(It.isAny()))
            .returns(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());
        browserCacheMock.setup((o) => o.clearStorage()).verifiable();

        const browser = await testSubject.launch({ clearDiskCache: true });

        expect(browser).toEqual(puppeteerBrowserMock);
    });

    it('should disable stealth plugin evasions', async () => {
        puppeteerExtraMock
            .setup((o) => o.use(It.isAny()))
            .returns(() => puppeteerExtraMock.object)
            .verifiable();
        puppeteerExtraMock
            .setup((o) => o.launch(It.isAny()))
            .returns(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());

        await testSubject.launch();
        const stealthPlugin = (testSubject as any).stealthPlugin as StealthPluginType;

        expect(stealthPlugin.enabledEvasions.has('iframe.contentWindow')).toEqual(false);
        expect(stealthPlugin.enabledEvasions.has('user-agent-override')).toEqual(false);
    });

    it('should connect to existing puppeteer browser', async () => {
        const connectFn = jest.fn().mockImplementation(() => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)));
        // @ts-expect-error
        Puppeteer.connect = connectFn;
        const browser = await testSubject.connect('ws');

        expect(browser).toEqual(puppeteerBrowserMock);
        expect(connectFn).toBeCalledWith({ browserWSEndpoint: 'ws', defaultViewport: null });
    });

    it('return plugin completion result', async () => {
        userAgentPluginMock
            .setup((o) => o.loadCompleted)
            .returns(() => true)
            .verifiable();
        const pageCreated = await testSubject.waitForPageCreation();
        expect(pageCreated).toEqual(true);
    });

    function setupPromiseUtils(simulateTimeout: boolean): void {
        promiseUtilsMock
            .setup((p) => p.waitFor(It.isAny(), It.isAny(), It.isAny()))
            .returns(async (fn, timeout, onTimeoutCallback) => {
                if (simulateTimeout) {
                    return onTimeoutCallback();
                } else {
                    return fn;
                }
            });
    }
});
