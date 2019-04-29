// tslint:disable:no-import-side-effect no-unsafe-any
import 'reflect-metadata';
import '../test-utilities/common-mock-methods';

import { Logger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { WebDriver } from './web-driver';

type puppeteerLaunch = (options?: Puppeteer.LaunchOptions) => Promise<Puppeteer.Browser>;

class PuppeteerBrowserMock {
    public isClosed: boolean;
    public async close(): Promise<void> {
        this.isClosed = true;

        return Promise.resolve();
    }
}

let testSubject: WebDriver;
let puppeteer: typeof Puppeteer;
let loggerMock: IMock<Logger>;
let puppeteerBrowserMock: PuppeteerBrowserMock;
let puppeteerLaunchMock: IMock<puppeteerLaunch>;

beforeEach(() => {
    puppeteerBrowserMock = new PuppeteerBrowserMock();
    puppeteerLaunchMock = Mock.ofType<puppeteerLaunch>();
    puppeteerLaunchMock
        .setup(async o => o(It.isAny()))
        .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>puppeteerBrowserMock)))
        .verifiable(Times.once());

    puppeteer = Puppeteer;
    puppeteer.launch = puppeteerLaunchMock.object;
    loggerMock = Mock.ofType(Logger);
    testSubject = new WebDriver(loggerMock.object, puppeteer);
});

describe('WebDriver', () => {
    it('should close puppeteer browser', async () => {
        await testSubject.launch();
        await testSubject.close();

        expect(puppeteerBrowserMock.isClosed).toEqual(true);
    });

    it('should launch puppeteer browser', async () => {
        const browser = await testSubject.launch();

        expect(browser).toEqual(puppeteerBrowserMock);
        puppeteerLaunchMock.verifyAll();
    });
});
