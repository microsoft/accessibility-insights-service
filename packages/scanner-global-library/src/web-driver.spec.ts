// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from './test-utilities/mockable-logger';
import { WebDriver } from './web-driver';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

type puppeteerLaunch = (options?: Puppeteer.LaunchOptions) => Promise<Puppeteer.Browser>;
type puppeteerConnect = (options?: Puppeteer.ConnectOptions) => Promise<Puppeteer.Browser>;

class PuppeteerBrowserMock {
    public isClosed: boolean;

    public async close(): Promise<void> {
        this.isClosed = true;

        return Promise.resolve();
    }

    public async userAgent(): Promise<string> {
        return 'HeadlessChrome user agent string';
    }
}

let testSubject: WebDriver;
let loggerMock: IMock<MockableLogger>;
let puppeteerBrowserMock: PuppeteerBrowserMock;
let puppeteerLaunchMock: IMock<puppeteerLaunch>;
let puppeteerConnectMock: IMock<puppeteerConnect>;

beforeEach(() => {
    puppeteerBrowserMock = new PuppeteerBrowserMock();
    puppeteerLaunchMock = Mock.ofType<puppeteerLaunch>();
    puppeteerConnectMock = Mock.ofType<puppeteerConnect>();

    const puppeteer = Puppeteer;
    puppeteer.launch = puppeteerLaunchMock.object;
    puppeteer.connect = puppeteerConnectMock.object;

    loggerMock = Mock.ofType(MockableLogger);
    testSubject = new WebDriver(loggerMock.object, puppeteer);
});

describe('WebDriver', () => {
    it('should close puppeteer browser', async () => {
        puppeteerLaunchMock
            .setup(async (o) => o(It.isAny()))
            .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
            .verifiable(Times.once());

        await testSubject.launch();
        await testSubject.close();

        expect(puppeteerBrowserMock.isClosed).toEqual(true);
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
});
