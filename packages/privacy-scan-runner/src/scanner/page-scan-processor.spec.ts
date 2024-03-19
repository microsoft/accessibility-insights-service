// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult, Page, BrowserError } from 'scanner-global-library';
import * as Puppeteer from 'puppeteer';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { PageMetadata, PageMetadataGenerator } from 'service-library';
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
    let pageMetadataGeneratorMock: IMock<PageMetadataGenerator>;
    let testSubject: PageScanProcessor;
    let pageScanResult: OnDemandPageScanResult;
    let scanMetadata: PrivacyScanMetadata;
    let privacyScanResult: PrivacyScanResult;
    let websiteScanData: WebsiteScanData;
    let pageMetadata: PageMetadata;

    const url = 'url';
    const pageScreenshot = 'page screenshot';
    const pageSnapshot = 'page snapshot';

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        privacyScannerMock = Mock.ofType<PrivacyScanner>();
        browserPageMock = Mock.ofType<Puppeteer.Page>();
        pageScanSchedulerMock = Mock.ofType<PageScanScheduler>();
        pageMetadataGeneratorMock = Mock.ofType<PageMetadataGenerator>();
        pageScanResult = {} as OnDemandPageScanResult;
        scanMetadata = {
            url: url,
            id: 'id',
            deepScan: undefined,
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
        websiteScanData = { id: 'websiteScanDataId' } as WebsiteScanData;
        pageMetadata = {
            redirection: false,
            authentication: false,
        } as PageMetadata;
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, pageMock.object, websiteScanData))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();

        testSubject = new PageScanProcessor(
            pageMock.object,
            privacyScannerMock.object,
            pageScanSchedulerMock.object,
            pageMetadataGeneratorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        privacyScannerMock.verifyAll();
        browserPageMock.verifyAll();
        pageScanSchedulerMock.verifyAll();
        pageMetadataGeneratorMock.verifyAll();
    });

    it('run successful scan', async () => {
        setupOpenPage();
        setupClosePage();
        privacyScannerMock
            .setup((s) => s.scan(url, pageMock.object))
            .returns(() => Promise.resolve(privacyScanResult))
            .verifiable();
        privacyScanResult = { ...privacyScanResult, pageScreenshot, pageSnapshot };

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results).toEqual(privacyScanResult);
    });

    it('run successful scan with known pages list', async () => {
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

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results).toEqual(privacyScanResult);
    });

    it('return error if page load failed', async () => {
        const browserError = {
            errorType: 'HttpErrorCode',
            statusCode: 404,
        } as BrowserError;

        pageMock.reset();
        setupOpenPage();
        setupClosePage();
        pageMock
            .setup((o) => o.browserError)
            .returns(() => browserError)
            .verifiable(Times.atLeastOnce());
        privacyScanResult = {
            error: browserError,
            pageResponseCode: browserError.statusCode,
        };

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results).toEqual(privacyScanResult);
    });

    it('returns error thrown by a scanner', async () => {
        const error = new Error('test error');
        setupOpenPage();
        setupClosePage();
        privacyScannerMock.setup((s) => s.scan(url, pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata, pageScanResult, websiteScanData)).rejects.toThrowError('test error');
    });

    it('returns error when URL is unscannable', async () => {
        pageMetadataGeneratorMock.reset();
        pageMetadata = {
            allowed: false,
            loadedUrl: 'loadedUrl',
            browserError: {
                errorType: 'UnsupportedResource',
                message: `The resource is not supported.`,
            },
        } as PageMetadata;
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, pageMock.object, websiteScanData))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();
        pageMock.reset();
        setupClosePage();
        privacyScanResult = {
            unscannable: true,
            scannedUrl: pageMetadata.loadedUrl,
            error: pageMetadata.browserError,
        };

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results).toEqual(privacyScanResult);
    });

    function setupOpenPage(): void {
        pageMock.setup((p) => p.navigate(url)).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
