import { Context } from '@azure/functions';
import { AxeResults } from 'axe-core';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { AxePuppeteerUtils } from './AxePuppeteerUtils';

import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let launchBrowserMock: IMock<typeof Puppeteer.launch>;
    let browserMock: IMock<Puppeteer.Browser>;
    let pageMock: IMock<Puppeteer.Page>;
    let scanner: Scanner;
    let axePuppeteerUtilsMock: IMock<AxePuppeteerUtils>;
    let contextMock: IMock<Context>;

    beforeEach(() => {
        browserMock = Mock.ofType<Puppeteer.Browser>();
        launchBrowserMock = Mock.ofType<typeof Puppeteer.launch>();
        axePuppeteerUtilsMock = Mock.ofType<AxePuppeteerUtils>();
        contextMock = Mock.ofType<Context>();
        scanner = new Scanner(launchBrowserMock.object, axePuppeteerUtilsMock.object, contextMock.object);
        pageMock = Mock.ofType<Puppeteer.Page>();

        browserMock = getPromisableDynamicMock(browserMock);

        launchBrowserMock
            .setup(async l =>
                l({
                    timeout: 15000,
                }),
            )
            .returns(async () => {
                return Promise.resolve(browserMock.object);
            });
        jest.setTimeout(20000);
    });

    it('should create instance', () => {
        expect(scanner).not.toBeNull();
    });

    it('should launch browser page with given url and scan the page with axe-core', async () => {
        const url = 'some url';
        const resultMock: IMock<AxeResults> = getPromisableDynamicMock(Mock.ofType<AxeResults>());

        pageMock = getPromisableDynamicMock(pageMock);
        browserMock.setup(async b => b.newPage()).returns(async () => Promise.resolve(pageMock.object));
        pageMock
            .setup(async p => p.goto(url))
            .returns(async () => Promise.resolve(undefined))
            .verifiable(Times.once());
        pageMock.setup(async p => p.close()).verifiable(Times.once());
        axePuppeteerUtilsMock.setup(apum => apum.init(pageMock.object)).verifiable(Times.once());
        axePuppeteerUtilsMock
            .setup(async apum => apum.analyze())
            .returns(async () => Promise.resolve(resultMock.object))
            .verifiable(Times.once());
        contextMock.setup(cm => cm.log(resultMock.object)).verifiable(Times.once());

        await scanner.scan(url);
        browserMock
            .setup(async b => b.close())
            .returns(async () => Promise.resolve(undefined))
            .verifiable();

        pageMock.verifyAll();
        browserMock.verifyAll();
        axePuppeteerUtilsMock.verifyAll();
        contextMock.verifyAll();
    }, 20000);
});
