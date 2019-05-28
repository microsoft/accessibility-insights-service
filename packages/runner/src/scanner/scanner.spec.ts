// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable:no-import-side-effect no-any
import 'reflect-metadata';
import '../../test-utilities/common-mock-methods';

import { AxeResults } from 'axe-core';
import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory, Page } from './page';
import { Scanner } from './scanner';

describe('Scanner', () => {
    let pageMock: IMock<Page>;
    let scanner: Scanner;
    let axeBrowserFactoryMock: IMock<AxePuppeteerFactory>;
    let loggerMock: IMock<Logger>;

    beforeEach(() => {
        axeBrowserFactoryMock = Mock.ofType();
        pageMock = Mock.ofType2<Page>(Page, [axeBrowserFactoryMock.object]);
        loggerMock = Mock.ofType(Logger);
        scanner = new Scanner(pageMock.object, loggerMock.object);
    });

    it('should create instance', () => {
        expect(scanner).not.toBeNull();
    });

    it('should launch browser page with given url and scan the page with axe-core', async () => {
        const url = 'some url';
        const axeResultsStub = ('axe results' as any) as AxeResults;
        setupNewPageCall(url);
        setupPageScanCall(axeResultsStub);
        await scanner.scan(url);

        verifyMocks();
    });

    it('should close browser if exception occurs', async () => {
        const url = 'some url';
        const errorMessage: string = `An error occurred while scanning website page ${url}.`;
        setupNewPageCall(url);
        setupPageErrorScanCall(errorMessage);
        setupPageCloseCall();
        const scanResult: AxeScanResults = await scanner.scan(url);
        expect(scanResult.error).not.toBeNull();
    });

    function setupNewPageCall(url: string): void {
        pageMock.setup(async p => p.create()).verifiable(Times.once());
        pageMock.setup(async p => p.enableBypassCSP()).verifiable(Times.once());
        pageMock.setup(async p => p.goto(url)).verifiable(Times.once());
    }

    function setupPageCloseCall(): void {
        pageMock.setup(async b => b.close()).verifiable();
    }

    function setupPageScanCall(axeResults: AxeResults): void {
        pageMock
            .setup(async p => p.scanForA11yIssues())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable(Times.once());
    }

    function setupPageErrorScanCall(errorMessage: string): void {
        pageMock
            .setup(async p => p.scanForA11yIssues())
            .returns(async () => Promise.reject(errorMessage))
            .verifiable(Times.once());
    }

    function verifyMocks(): void {
        pageMock.verifyAll();
    }
});
