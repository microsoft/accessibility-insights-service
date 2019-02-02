import { Context } from '@azure/functions';
import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';

import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AxePuppeteerFactory } from './AxePuppeteerFactory';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let launchBrowserMock: IMock<typeof Puppeteer.launch>;
    let browserMock: IMock<Puppeteer.Browser>;
    let pageMock: IMock<Puppeteer.Page>;
    let scanner: Scanner;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let axePuppeteerMock: IMock<AxePuppeteer>;
    let contextMock: IMock<Context>;

    beforeEach(() => {
        browserMock = Mock.ofType<Puppeteer.Browser>();
        launchBrowserMock = Mock.ofType<typeof Puppeteer.launch>();
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
        contextMock = Mock.ofType<Context>();
        scanner = new Scanner(launchBrowserMock.object, axePuppeteerFactoryMock.object, contextMock.object);
        pageMock = Mock.ofType<Puppeteer.Page>();
        axePuppeteerMock = Mock.ofType<AxePuppeteer>();

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
        // tslint:disable-next-line:no-any
        const axeResultsStub = 'axe results' as any;
        setupNewBrowserPageCall(url);
        setupPageScanCall(axeResultsStub);
        setupLogScanResultsCall(axeResultsStub);
        setupBrowserPageCloseCall();

        await scanner.scan(url);

        verifyMocks();
    }, 20000);

    function setupNewBrowserPageCall(url: string): void {
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
        axePuppeteerFactoryMock
            .setup(apfm => apfm.getInstance(pageMock.object))
            .returns(() => axePuppeteerMock.object)
            .verifiable(Times.once());
        axePuppeteerMock
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
        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();
        contextMock.verifyAll();
    }
});
