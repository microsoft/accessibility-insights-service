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
        setupBrowserPageCalls(url);
        setupBrowserPageCloseCall();
        setupPageScanCall(resultMock.object);
        setupLogScanResultsCall(resultMock.object);

        await scanner.scan(url);

        verifyMocks();
    }, 20000);

    function setupBrowserPageCalls(url: string): void {
        pageMock = getPromisableDynamicMock(pageMock);
        browserMock.setup(async b => b.newPage()).returns(async () => Promise.resolve(pageMock.object));
        pageMock.setup(async p => p.goto(url)).verifiable(Times.once());
        pageMock.setup(async p => p.setBypassCSP(true)).verifiable(Times.once());
    }

    function setupBrowserPageCloseCall(): void {
        browserMock.setup(async b => b.close()).verifiable();
        pageMock.setup(async p => p.close()).verifiable(Times.once());
    }

    function setupPageScanCall(axeResults: AxeResults): void {
        axePuppeteerUtilsMock.setup(apum => apum.init(pageMock.object)).verifiable(Times.once());
        axePuppeteerUtilsMock
            .setup(async apum => apum.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function setupLogScanResultsCall(axeResults: AxeResults): void {
        contextMock.setup(cm => cm.log(axeResults)).verifiable(Times.once());
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
        browserMock.verifyAll();
        axePuppeteerUtilsMock.verifyAll();
        contextMock.verifyAll();
    }
});
