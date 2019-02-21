import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';

import { getPromisableDynamicMock } from '../../test-utilities/promisable-mock';
import { AxePuppeteerFactory } from '../axe-puppeteer-factory';
import { Browser } from './browser';

describe('Browser', () => {
    let puppeteerBrowserMock: IMock<Puppeteer.Browser>;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let testSubject: Browser;

    beforeEach(() => {
        puppeteerBrowserMock = Mock.ofType<Puppeteer.Browser>();
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();

        testSubject = new Browser(puppeteerBrowserMock.object, axePuppeteerFactoryMock.object);
    });

    it('should create new page', async () => {
        const puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());

        puppeteerBrowserMock
            .setup(async b => b.newPage())
            .returns(async () => Promise.resolve(puppeteerPageMock.object))
            .verifiable();

        const page = await testSubject.newPage();

        puppeteerBrowserMock.verifyAll();
        expect(page).toBeTruthy();
    });

    it('should close', async () => {
        await testSubject.close();

        puppeteerBrowserMock.verify(async b => b.close(), Times.once());
    });
});
