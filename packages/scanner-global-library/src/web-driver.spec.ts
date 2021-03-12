// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ChildProcess } from 'child_process';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times, MockBehavior } from 'typemoq';
import { PromiseUtils } from 'common';
import { MockableLogger } from './test-utilities/mockable-logger';
import { WebDriver } from './web-driver';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

type puppeteerLaunch = (options?: Puppeteer.LaunchOptions) => Promise<Puppeteer.Browser>;
type puppeteerConnect = (options?: Puppeteer.ConnectOptions) => Promise<Puppeteer.Browser>;

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
let puppeteerLaunchMock: IMock<puppeteerLaunch>;
let puppeteerConnectMock: IMock<puppeteerConnect>;
let promiseUtilsMock: IMock<PromiseUtils>;

beforeEach(() => {
    puppeteerBrowserMock = new PuppeteerBrowserMock();
    puppeteerLaunchMock = Mock.ofType<puppeteerLaunch>();
    puppeteerConnectMock = Mock.ofType<puppeteerConnect>();
    promiseUtilsMock = Mock.ofType<PromiseUtils>();

    const puppeteer = Puppeteer;
    puppeteer.launch = puppeteerLaunchMock.object;
    puppeteer.connect = puppeteerConnectMock.object;

    loggerMock = Mock.ofType(MockableLogger);
    testSubject = new WebDriver(promiseUtilsMock.object, loggerMock.object, puppeteer);
});

describe('WebDriver', () => {
    describe('close', () => {
        let pageMock: IMock<Puppeteer.Page>;
        let browserProcessMock: IMock<ChildProcess>;

        beforeEach(() => {
            pageMock = Mock.ofType<Puppeteer.Page>();
            puppeteerBrowserMock.browserPages = [pageMock.object];

            browserProcessMock = Mock.ofInstance({ kill: () => null } as ChildProcess, MockBehavior.Strict);
            puppeteerBrowserMock.childProcess = browserProcessMock.object;
        });

        it('should close puppeteer browser', async () => {
            setupPromiseUtils(false);
            puppeteerLaunchMock
                .setup(async (o) => o(It.isAny()))
                .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
                .verifiable(Times.once());
            pageMock
                .setup((p) => p.close())
                .returns(() => Promise.resolve())
                .verifiable();

            await testSubject.launch();
            await testSubject.close();

            expect(puppeteerBrowserMock.isClosed).toEqual(true);
            pageMock.verifyAll();
        });

        it('should kill browser process if close times out', async () => {
            setupPromiseUtils(true);
            puppeteerLaunchMock
                .setup(async (o) => o(It.isAny()))
                .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
                .verifiable(Times.once());
            browserProcessMock.setup((bp) => bp.kill('SIGINT')).verifiable();

            await testSubject.launch();
            await testSubject.close();

            browserProcessMock.verifyAll();
        });

        it('should do nothing if close times out and browser process is not found', async () => {
            setupPromiseUtils(true);
            puppeteerBrowserMock.childProcess = undefined;
            puppeteerLaunchMock
                .setup(async (o) => o(It.isAny()))
                .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
                .verifiable(Times.once());

            await testSubject.launch();
            await testSubject.close();

            browserProcessMock.verifyAll();
        });
    });

    it('should launch puppeteer browser', async () => {
        puppeteerLaunchMock
            .setup(async (o) => o(It.isAny()))
            .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());

        const browser = await testSubject.launch();

        expect(browser).toEqual(puppeteerBrowserMock);
        puppeteerLaunchMock.verifyAll();
    });

    it('should connect to existing puppeteer browser', async () => {
        puppeteerConnectMock
            .setup(async (c) => c(It.isObjectWith({ browserWSEndpoint: 'ws' })))
            .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());

        const browser = await testSubject.connect('ws');

        expect(browser).toEqual(puppeteerBrowserMock);
        puppeteerLaunchMock.verifyAll();
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
