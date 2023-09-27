// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page, BrowserError, ResourceAuthenticationResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { cloneDeep } from 'lodash';
import { PageAnalysisResult } from 'scanner-global-library/dist/network/page-analyzer';
import { AxeScanner } from '../scanner/axe-scanner';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { PageScanProcessor } from './page-scan-processor';
import { DeepScanner } from './deep-scanner';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let axeScannerMock: IMock<AxeScanner>;
    let deepScannerMock: IMock<DeepScanner>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let discoveryPatternFactoryMock: IMock<typeof createDiscoveryPattern>;
    let testSubject: PageScanProcessor;
    let axeScanResults: AxeScanResults;
    let pageScanResult: OnDemandPageScanResult;
    let websiteScanResult: WebsiteScanResult;
    let pageAnalysisResult: PageAnalysisResult;

    const url = 'http://localhost';
    const pageScreenshot = 'page screenshot';
    const pageSnapshot = 'page snapshot';
    const generatedDiscoveryPattern = `^http(s?)://localhost(.*)`;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        axeScannerMock = Mock.ofType<AxeScanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        discoveryPatternFactoryMock = Mock.ofType<typeof createDiscoveryPattern>();
        axeScanResults = { scannedUrl: url } as AxeScanResults;
        pageScanResult = { id: 'id' } as OnDemandPageScanResult;
        pageAnalysisResult = { redirection: false } as PageAnalysisResult;

        pageMock
            .setup((o) => o.getPageScreenshot())
            .returns(() => Promise.resolve(pageScreenshot))
            .verifiable();
        pageMock
            .setup((o) => o.getPageSnapshot())
            .returns(() => Promise.resolve(pageSnapshot))
            .verifiable();
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        pageMock
            .setup((o) => o.pageAnalysisResult)
            .returns(() => pageAnalysisResult)
            .verifiable();
        websiteScanResult = {} as WebsiteScanResult;
        discoveryPatternFactoryMock.setup((o) => o(url)).returns(() => generatedDiscoveryPattern);

        testSubject = new PageScanProcessor(
            pageMock.object,
            axeScannerMock.object,
            deepScannerMock.object,
            loggerMock.object,
            discoveryPatternFactoryMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        axeScannerMock.verifyAll();
        deepScannerMock.verifyAll();
        puppeteerPageMock.verifyAll();
        discoveryPatternFactoryMock.verifyAll();
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
        deepScannerMock.setup((o) => o.runDeepScan(It.isAny(), It.isAny(), websiteScanResult, It.isAny())).verifiable();
        pageScanResult = {
            ...pageScanResult,
            authentication: { hint: 'azure-ad' },
        };

        const authenticationResult = {
            authenticationType: 'azure-ad',
            authenticated: true,
        } as ResourceAuthenticationResult;
        pageMock
            .setup((p) => p.authenticationResult)
            .returns(() => authenticationResult)
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanResult);

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
        deepScannerMock.setup((o) => o.runDeepScan(It.isAny(), It.isAny(), websiteScanResult, It.isAny())).verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanResult);

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
        deepScannerMock.setup((o) => o.runDeepScan(It.isAny(), It.isAny(), websiteScanResult, It.isAny())).verifiable(Times.never());

        await expect(testSubject.scan(scanMetadata, pageScanResult, websiteScanResult)).rejects.toThrowError('test error');
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
            .setup((o) => o.browserError)
            .returns(() => browserError)
            .verifiable(Times.atLeastOnce());

        const expectedResult = {
            error: browserError,
            pageResponseCode: browserError.statusCode,
        };
        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanResult);

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
        deepScannerMock.setup((o) => o.runDeepScan(scanMetadata, pageScanResult, websiteScanResult, pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata, pageScanResult, websiteScanResult)).rejects.toThrowError('test error');
    });

    function setupOpenPage(enableAuthentication: boolean = false): void {
        pageMock.setup((p) => p.navigate(url, { enableAuthentication })).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
