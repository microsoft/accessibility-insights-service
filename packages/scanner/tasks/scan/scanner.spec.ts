import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';

import { getPromisableDynamicMock } from '../../test-utilities/promisable-mock';
import { Browser } from './browser/browser';
import { BrowserFactory } from './browser/browser-factory';
import { Page } from './browser/page';
import { Scanner } from './scanner';

// tslint:disable: no-any

describe('Scanner', () => {
    let browserFactoryMock: IMock<BrowserFactory>;
    let browserMock: IMock<Browser>;
    let pageMock: IMock<Page>;
    let scanner: Scanner;

    beforeEach(() => {
        browserMock = Mock.ofType<Browser>();
        browserMock = getPromisableDynamicMock(browserMock);

        browserFactoryMock = Mock.ofType<BrowserFactory>();
        scanner = new Scanner(browserFactoryMock.object);

        pageMock = Mock.ofType<Page>();
        pageMock = getPromisableDynamicMock(pageMock);
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
    });

    it('should close browser if exception occurs', async () => {
        const url = 'some url';
        const exceptionMessage: any = 'test error message';
        setupBrowserCreationCall();
        browserMock.setup(async b => b.newPage()).returns(async () => Promise.reject(exceptionMessage));

        await expect(scanner.scan(url)).rejects.toEqual(exceptionMessage);

        browserMock.verify(async b => b.close(), Times.once());
    });

    function setupBrowserCreationCall(): void {
        browserFactoryMock.setup(async f => f.createInstance()).returns(async () => Promise.resolve(browserMock.object));
    }

    function setupNewBrowserPageCall(url: string): void {
        setupBrowserCreationCall();
        browserMock.setup(async b => b.newPage()).returns(async () => Promise.resolve(pageMock.object));

        pageMock.setup(async p => p.enableBypassCSP()).verifiable(Times.once());
        pageMock.setup(async p => p.goto(url)).verifiable(Times.once());
    }

    function setupBrowserPageCloseCall(): void {
        browserMock.setup(async b => b.close()).verifiable();
    }

    function setupPageScanCall(axeResults: AxeResults): void {
        pageMock
            .setup(async p => p.scanForA11yIssues())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
        browserMock.verifyAll();
    }
});
