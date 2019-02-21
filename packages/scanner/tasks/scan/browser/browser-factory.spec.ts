import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';

import { AxePuppeteerFactory } from '../axe-puppeteer-factory';
import { BrowserFactory } from './browser-factory';

describe('BrowserFactory', () => {
    let puppeteerMock: IMock<typeof Puppeteer>;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;

    beforeEach(() => {
        puppeteerMock = Mock.ofType<typeof Puppeteer>();
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
    });

    it('should create instance', async () => {
        const testSubject = new BrowserFactory(puppeteerMock.object, axePuppeteerFactoryMock.object);
        const puppeteerBrowserMock = Mock.ofType<Puppeteer.Browser>();
        const browser = await testSubject.createInstance();

        puppeteerMock
            .setup(async p =>
                p.launch({
                    headless: true,
                    timeout: 15000,
                    args: ['--disable-dev-shm-usage'],
                }),
            )
            .returns(async () => Promise.resolve(puppeteerBrowserMock.object))
            .verifiable();

        puppeteerMock.verifyAll();
        expect(browser).toBeTruthy();
    });
});
