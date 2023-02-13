// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page, BrowserError, ResourceAuthenticationResult } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { System } from 'common';
import * as Puppeteer from 'puppeteer';
import { cloneDeep } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { PageScanProcessor } from './page-scan-processor';
import { DeepScanner } from './deep-scanner';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let axeScannerMock: IMock<AxeScanner>;
    let deepScannerMock: IMock<DeepScanner>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let testSubject: PageScanProcessor;
    let axeScanResults: AxeScanResults;
    let pageScanResult: OnDemandPageScanResult;

    const url = 'url';
    const pageScreenshot = 'page screenshot';
    const pageSnapshot = 'page snapshot';

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        axeScannerMock = Mock.ofType<AxeScanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        axeScanResults = { scannedUrl: url } as AxeScanResults;
        pageScanResult = { id: 'id' } as OnDemandPageScanResult;

        pageMock
            .setup((o) => o.getPageScreenshot())
            .returns(() => Promise.resolve(pageScreenshot))
            .verifiable();
        pageMock
            .setup((o) => o.getPageSnapshot())
            .returns(() => Promise.resolve(pageSnapshot))
            .verifiable();

        testSubject = new PageScanProcessor(pageMock.object, axeScannerMock.object, deepScannerMock.object, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        axeScannerMock.verifyAll();
        deepScannerMock.verifyAll();
        puppeteerPageMock.verifyAll();
    });

    it.each([false, undefined])('scans successfully with deepScan=%s', async (deepScan: boolean) => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: deepScan,
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

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

    it('scan with authentication enabled', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

        setupOpenPage(true);
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((d) => d.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());
        pageScanResult = {
            ...pageScanResult,
            authentication: { hint: 'azure-ad' },
        };

        const lastAuthenticationResult = {
            authenticationType: 'azure-ad',
            authenticated: true,
        } as ResourceAuthenticationResult;
        pageMock
            .setup((p) => p.lastAuthenticationResult)
            .returns(() => lastAuthenticationResult)
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult);

        const expectedPageScanResult = cloneDeep({
            ...pageScanResult,
            authentication: {
                hint: 'azure-ad',
                detected: 'azure-ad',
                state: 'succeeded',
            },
        });
        expect(pageScanResult).toEqual(expectedPageScanResult);
        expect(results).toEqual(axeScanResults);
    });

    it('scans successfully when deep scan is enabled', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

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

    it('returns error if page failed to load.', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        const browserError = {
            errorType: 'HttpErrorCode',
            statusCode: 404,
        } as BrowserError;

        pageMock.reset();
        setupOpenPage();
        setupClosePage();
        pageMock
            .setup((o) => o.lastBrowserError)
            .returns(() => browserError)
            .verifiable(Times.atLeastOnce());

        const expectedResult = {
            error: browserError,
            pageResponseCode: browserError.statusCode,
        };
        const results = await testSubject.scan(scanMetadata, pageScanResult);

        expect(results).toEqual(expectedResult);
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

    function setupOpenPage(enableAuthentication: boolean = false): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigate(url, { enableAuthentication })).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
