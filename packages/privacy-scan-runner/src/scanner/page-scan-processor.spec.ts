// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult, Page } from 'scanner-global-library';
import { System } from 'common';
import * as Puppeteer from 'puppeteer';
import { OnDemandPageScanResult } from 'storage-documents';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';
import { PageScanProcessor } from './page-scan-processor';
import { PageScanScheduler } from './page-scan-scheduler';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let privacyScannerMock: IMock<PrivacyScanner>;
    let browserPageMock: IMock<Puppeteer.Page>;
    let pageScanSchedulerMock: IMock<PageScanScheduler>;
    let testSubject: PageScanProcessor;
    let pageScanResult: OnDemandPageScanResult;
    let scanMetadata: PrivacyScanMetadata;
    let privacyScanResult: PrivacyScanResult;

    const url = 'url';
    const pageScreenshot = 'page screenshot';
    const pageSnapshot = 'page snapshot';

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        privacyScannerMock = Mock.ofType<PrivacyScanner>();
        browserPageMock = Mock.ofType<Puppeteer.Page>();
        pageScanSchedulerMock = Mock.ofType<PageScanScheduler>();
        pageScanResult = {} as OnDemandPageScanResult;
        scanMetadata = {
            url: url,
            id: 'id',
            deepScan: false,
        };
        pageMock
            .setup((o) => o.getPageScreenshot())
            .returns(() => Promise.resolve(pageScreenshot))
            .verifiable();
        pageMock
            .setup((o) => o.getPageSnapshot())
            .returns(() => Promise.resolve(pageSnapshot))
            .verifiable();
        privacyScanResult = { scannedUrl: url } as PrivacyScanResult;

        testSubject = new PageScanProcessor(pageMock.object, privacyScannerMock.object, pageScanSchedulerMock.object, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        privacyScannerMock.verifyAll();
        browserPageMock.verifyAll();
        pageScanSchedulerMock.verifyAll();
    });

    it('run successful scan', async () => {
        setupOpenPage();
        setupClosePage();
        privacyScannerMock
            .setup((s) => s.scan(url, pageMock.object))
            .returns(() => Promise.resolve(privacyScanResult))
            .verifiable();
        privacyScanResult = { ...privacyScanResult, pageScreenshot, pageSnapshot };

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(privacyScanResult);
    });

    it('run successful scan with known pages list', async () => {
        scanMetadata.deepScan = true;
        setupOpenPage();
        setupClosePage();
        privacyScannerMock
            .setup((s) => s.scan(url, pageMock.object))
            .returns(() => Promise.resolve(privacyScanResult))
            .verifiable();
        pageScanSchedulerMock
            .setup((o) => o.schedulePageScan(pageScanResult))
            .returns(() => Promise.resolve())
            .verifiable();
        privacyScanResult = { ...privacyScanResult, pageScreenshot, pageSnapshot };

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(privacyScanResult);
    });

    it('returns error thrown by a scanner', async () => {
        const error = new Error('test error');
        setupOpenPage();
        setupClosePage();
        privacyScannerMock.setup((s) => s.scan(url, pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata, pageScanResult)).rejects.toThrowError('test error');
    });

    it('handles browser close failure', async () => {
        const error = new Error('browser close error');
        setupOpenPage();
        pageMock
            .setup((p) => p.close())
            .throws(error)
            .verifiable();
        loggerMock.setup((l) => l.logError(It.isAny(), { error: System.serializeError(error) })).verifiable();

        await testSubject.scan(scanMetadata, pageScanResult);
    });

    function setupOpenPage(): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(url)).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
