// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { System } from 'common';
import * as Puppeteer from 'puppeteer';
import { AxeScanner } from '../scanner/axe-scanner';
import { PageScanProcessor } from './page-scan-processor';
import { DeepScanner } from './deep-scanner';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let axeScannerMock: IMock<AxeScanner>;
    let deepScannerMock: IMock<DeepScanner>;
    let browserPageMock: IMock<Puppeteer.Page>;

    const url = 'url';
    const axeScanResults = { scannedUrl: url } as AxeScanResults;
    const pageScanResult = { id: 'id' } as OnDemandPageScanResult;

    let testSubject: PageScanProcessor;

    beforeEach(() => {
        PageScanProcessor.waitForPageScrollSec = 1;

        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        axeScannerMock = Mock.ofType<AxeScanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        browserPageMock = Mock.ofType<Puppeteer.Page>();

        testSubject = new PageScanProcessor(pageMock.object, axeScannerMock.object, deepScannerMock.object, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        axeScannerMock.verifyAll();
        deepScannerMock.verifyAll();
        browserPageMock.verifyAll();
    });

    it.each([false, undefined])('scans successfully with deepScan=%s', async (deepScan: boolean) => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: deepScan,
        };

        setupOpenPage();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(axeScanResults);
    });

    it('scans successfully when deep scan is enabled', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };

        setupOpenPage();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        pageMock
            .setup((p) => p.isOpen())
            .returns(() => true)
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(axeScanResults);
    });

    it('returns error thrown by axe scanner', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        const error = new Error('test error');

        setupOpenPage();
        setupClosePage();
        axeScannerMock.setup((s) => s.scan(pageMock.object)).throws(error);
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

        await expect(testSubject.scan(scanMetadata, pageScanResult)).rejects.toThrowError('test error');
    });

    it('returns error thrown by deep scanner', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };
        const error = new Error('test error');

        setupOpenPage();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        pageMock
            .setup((p) => p.isOpen())
            .returns(() => true)
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(scanMetadata, pageScanResult, pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata, pageScanResult)).rejects.toThrowError('test error');
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

        await testSubject.scan(scanMetadata, pageScanResult);
    });

    it('scans successfully with timeout', async () => {
        let runsWithTimeoutCount = 1;
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: false,
        };

        setupOpenPage();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => {
                if (runsWithTimeoutCount > 0) {
                    runsWithTimeoutCount--;

                    return Promise.resolve({ error: { errorType: 'ScanTimeout' } } as AxeScanResults);
                } else {
                    return Promise.resolve(axeScanResults);
                }
            })
            .verifiable(Times.exactly(2));
        browserPageMock
            .setup(async (o) => o.evaluate(It.isAny()))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
        pageMock
            .setup((o) => o.page)
            .returns(() => browserPageMock.object)
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(axeScanResults);
    });

    function setupOpenPage(): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(url)).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
