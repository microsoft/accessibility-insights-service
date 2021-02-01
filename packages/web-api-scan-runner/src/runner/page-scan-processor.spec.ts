// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { System } from 'common';
import { Scanner } from '../scanner/scanner';
import { DeepScanner } from '../crawl-runner/deep-scanner';
import { PageScanProcessor } from './page-scan-processor';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let scannerMock: IMock<Scanner>;
    let deepScannerMock: IMock<DeepScanner>;

    const url = 'url';
    const axeScanResults = { scannedUrl: url } as AxeScanResults;
    const pageScanResult = { id: 'id' } as OnDemandPageScanResult;

    let testSubject: PageScanProcessor;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        scannerMock = Mock.ofType<Scanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();

        testSubject = new PageScanProcessor(loggerMock.object, pageMock.object, scannerMock.object, deepScannerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        scannerMock.verifyAll();
        deepScannerMock.verifyAll();
    });

    it('scans successfully without deepScan', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        const expectedResults = { axeScanResults };

        setupOpenPage();
        setupClosePage();
        scannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

        const results = await testSubject.scanUrl(scanMetadata, pageScanResult);

        expect(results).toEqual(expectedResults);
    });

    it('scans successfully with deepScan', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };
        const expectedResults = { axeScanResults };

        setupOpenPage();
        setupClosePage();
        scannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable();

        const results = await testSubject.scanUrl(scanMetadata, pageScanResult);

        expect(results).toEqual(expectedResults);
    });

    it('returns error thrown by Scanner', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        const error = new Error('test error');
        const expectedResults = { error };

        setupOpenPage();
        setupClosePage();
        scannerMock.setup((s) => s.scan(pageMock.object)).throws(error);
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

        const results = await testSubject.scanUrl(scanMetadata, pageScanResult);

        expect(results).toEqual(expectedResults);
    });

    it('returns error thrown by DeepScanner', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };
        const error = new Error('test error');
        const expectedResults = {
            error: error,
            axeScanResults: axeScanResults,
        };

        setupOpenPage();
        setupClosePage();
        scannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(scanMetadata, pageScanResult, pageMock.object)).throws(error);

        const results = await testSubject.scanUrl(scanMetadata, pageScanResult);

        expect(results).toEqual(expectedResults);
    });

    it('handles browser close failure', async () => {
        const error = new Error('browser close error');
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        setupOpenPage();
        pageMock
            .setup((p) => p.close())
            .throws(error)
            .verifiable();
        loggerMock.setup((l) => l.logError(It.isAny(), { error: System.serializeError(error) })).verifiable();

        await testSubject.scanUrl(scanMetadata, pageScanResult);
    });

    function setupOpenPage(): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(url)).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
