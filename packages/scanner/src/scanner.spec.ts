// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-import-side-effect no-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { IMock, Mock, Times } from 'typemoq';
import { MockableLogger } from './test-utilities/mockable-logger';

import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { Page } from './page';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let pageMock: IMock<Page>;
    let scanner: Scanner;
    let axeBrowserFactoryMock: IMock<AxePuppeteerFactory>;
    let loggerMock: IMock<MockableLogger>;

    beforeEach(() => {
        axeBrowserFactoryMock = Mock.ofType();
        pageMock = Mock.ofType2<Page>(Page, [axeBrowserFactoryMock.object]);
        loggerMock = Mock.ofType(MockableLogger);
        scanner = new Scanner(pageMock.object, loggerMock.object);
    });

    it('should create instance', () => {
        expect(scanner).not.toBeNull();
    });

    it('should launch browser page with given url and scan the page with axe-core', async () => {
        const url = 'some url';
        const axeResultsStub = ('axe results' as any) as AxeResults;
        setupNewPageCall(url);
        setupPageScanCall(url, axeResultsStub);
        await scanner.scan(url);

        verifyMocks();
    });

    it('should close browser if exception occurs', async () => {
        const url = 'some url';
        const errorMessage: string = `An error occurred while scanning website page ${url}.`;
        setupNewPageCall(url);
        setupPageErrorScanCall(url, errorMessage);
        setupPageCloseCall();
        const scanResult: AxeScanResults = await scanner.scan(url);
        expect(scanResult.error).not.toBeNull();
    });

    function setupNewPageCall(url: string): void {
        pageMock.setup(async p => p.create()).verifiable(Times.once());
        pageMock.setup(async p => p.enableBypassCSP()).verifiable(Times.once());
    }

    function setupPageCloseCall(): void {
        pageMock.setup(async b => b.close()).verifiable();
    }

    function setupPageScanCall(url: string, axeResults: AxeResults): void {
        pageMock
            .setup(async p => p.scanForA11yIssues(url))
            .returns(async () => Promise.resolve({ results: axeResults, pageResponseCode: 101 }))
            .verifiable(Times.once());
    }

    function setupPageErrorScanCall(url: string, errorMessage: string): void {
        pageMock
            .setup(async p => p.scanForA11yIssues(url))
            .returns(async () => Promise.resolve({ error: errorMessage, pageResponseCode: 101 }))
            .verifiable(Times.once());
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
    }
});
