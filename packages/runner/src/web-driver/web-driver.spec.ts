// tslint:disable:no-import-side-effect
import '../test-utilities/common-mock-methods';

import * as Puppeteer from 'puppeteer';
import { WebDriver } from './web-driver';
import { IMock, Mock, It, Times } from 'typemoq';

type puppeteerLaunch = (options?: Puppeteer.LaunchOptions) => Promise<Puppeteer.Browser>;

class BrowserMock {
    public isClosed: boolean;
    public close(): Promise<void> {
        this.isClosed = true;
        return Promise.resolve();
    }
}

let testSubject: WebDriver;
let puppeteer: typeof Puppeteer;
let browserMock: BrowserMock;
let puppeteerLaunchMock: IMock<puppeteerLaunch>;

beforeEach(() => {
    browserMock = new BrowserMock();
    puppeteerLaunchMock = Mock.ofType<puppeteerLaunch>();
    puppeteerLaunchMock
        .setup(o => o(It.isAny()))
        .returns(async () => Promise.resolve(<Puppeteer.Browser>(<unknown>browserMock)))
        .verifiable(Times.once());

    puppeteer = Puppeteer;
    puppeteer.launch = puppeteerLaunchMock.object;

    testSubject = new WebDriver(puppeteer);
});

describe('WebDriver', () => {
    it('should close puppeteer browser', async () => {
        await testSubject.launch();
        await testSubject.close();

        expect(browserMock.isClosed).toEqual(true);
    });

    it('should launch puppeteer browser', async () => {
        const browser = await testSubject.launch();

        expect(browser).toEqual(browserMock);
        puppeteerLaunchMock.verifyAll();
    });
});
