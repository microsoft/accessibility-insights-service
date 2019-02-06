import { AxeResults } from 'axe-core';
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';

import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let puppeteerMock: IMock<typeof Puppeteer>;
    let browserMock: IMock<Puppeteer.Browser>;
    let pageMock: IMock<Puppeteer.Page>;
    let scanner: Scanner;
    let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
    let axePuppeteerMock: IMock<AxePuppeteer>;

    beforeEach(() => {
        browserMock = Mock.ofType<Puppeteer.Browser>();
        puppeteerMock = Mock.ofType<typeof Puppeteer>();
        axePuppeteerFactoryMock = Mock.ofType<AxePuppeteerFactory>();
        scanner = new Scanner(puppeteerMock.object, axePuppeteerFactoryMock.object);
        pageMock = Mock.ofType<Puppeteer.Page>();
        axePuppeteerMock = Mock.ofType<AxePuppeteer>();

        browserMock = getPromisableDynamicMock(browserMock);

        puppeteerMock
            .setup(async p =>
                p.launch({
                    headless: true,
                    timeout: 15000,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
        const axeResultsStub = ('axe results' as any) as AxeResults;
        setupNewBrowserPageCall(url);
        setupPageScanCall(axeResultsStub);
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
            .setup(apfm => apfm.createInstance(pageMock.object))
            .returns(() => axePuppeteerMock.object)
            .verifiable(Times.once());
        axePuppeteerMock
            .setup(async apum => apum.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
        browserMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();
    }
});
