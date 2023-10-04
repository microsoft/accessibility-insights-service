// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page, BrowserError, ResourceAuthenticationResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { cloneDeep } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { PageMetadata, PageMetadataGenerator } from '../website-builder/page-metadata-generator';
import { PageScanProcessor } from './page-scan-processor';
import { DeepScanner } from './deep-scanner';

let loggerMock: IMock<GlobalLogger>;
let pageMock: IMock<Page>;
let axeScannerMock: IMock<AxeScanner>;
let deepScannerMock: IMock<DeepScanner>;
let pageMetadataGeneratorMock: IMock<PageMetadataGenerator>;
let testSubject: PageScanProcessor;
let axeScanResults: AxeScanResults;
let pageScanResult: OnDemandPageScanResult;
let websiteScanResult: WebsiteScanResult;
let pageMetadata: PageMetadata;

const url = 'http://localhost';
const pageScreenshot = 'page screenshot';
const pageSnapshot = 'page snapshot';
const generatedDiscoveryPattern = `^http(s?)://localhost(.*)`;

describe(PageScanProcessor, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        axeScannerMock = Mock.ofType<AxeScanner>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        pageMetadataGeneratorMock = Mock.ofType<PageMetadataGenerator>();
        axeScanResults = { scannedUrl: url } as AxeScanResults;
        pageScanResult = { id: 'id' } as OnDemandPageScanResult;
        websiteScanResult = {} as WebsiteScanResult;
        pageMetadata = {
            redirection: false,
            authentication: false,
        } as PageMetadata;
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, websiteScanResult))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();

        testSubject = new PageScanProcessor(
            pageMock.object,
            axeScannerMock.object,
            deepScannerMock.object,
            pageMetadataGeneratorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        axeScannerMock.verifyAll();
        deepScannerMock.verifyAll();
        pageMetadataGeneratorMock.verifyAll();
    });

    it('skip page scan for unscannable location', async () => {
        const loadedUrl = 'http://example.org';
        pageMetadata = {
            foreignLocation: true,
            authentication: false,
            loadedUrl,
        } as PageMetadata;
        websiteScanResult = { discoveryPatterns: [generatedDiscoveryPattern] } as WebsiteScanResult;
        const scanMetadata = {
            url,
            id: 'id',
            deepScan: true,
        };
        axeScanResults = {
            unscannable: true,
            error: `The scan URL was redirected to foreign location ${loadedUrl}`,
        };
        pageMetadataGeneratorMock.reset();
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, websiteScanResult))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();
        setupClosePage();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanResult);

        expect(results).toEqual(axeScanResults);
    });

    it('scan with authentication enabled', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

        pageMetadata = {
            foreignLocation: true,
            authentication: true,
            authenticationType: 'entraId',
        } as PageMetadata;
        pageMetadataGeneratorMock.reset();
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, websiteScanResult))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();

        setupNavigatePage(url, true);
        setupGetPageState();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((o) => o.runDeepScan(It.isAny(), It.isAny(), websiteScanResult, It.isAny())).verifiable();
        pageScanResult = {
            ...pageScanResult,
            authentication: { hint: 'entraId' },
        };

        const authenticationResult = {
            authenticationType: 'entraId',
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
                hint: 'entraId',
                detected: 'entraId',
                state: 'succeeded',
            },
        });
        expect(pageScanResult).toEqual(expectedPageScanResult);
        expect(results).toEqual(axeScanResults);
    });

    it('scan with unknown authentication detected', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

        pageMetadata = {
            foreignLocation: true,
            authentication: true,
            authenticationType: 'unknown',
        } as PageMetadata;
        pageMetadataGeneratorMock.reset();
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, websiteScanResult))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();

        setupNavigatePage(url);
        setupGetPageState();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((o) => o.runDeepScan(It.isAny(), It.isAny(), websiteScanResult, It.isAny())).verifiable();
        pageMock
            .setup((p) => p.authenticationResult)
            .returns(() => undefined)
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanResult);

        const expectedPageScanResult = cloneDeep({
            ...pageScanResult,
            authentication: {
                detected: 'unknown',
                state: 'unauthenticated',
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

        setupNavigatePage();
        setupGetPageState();
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

        setupNavigatePage();
        setupGetPageState();
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
        setupNavigatePage();
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

        setupNavigatePage();
        setupGetPageState();
        setupClosePage();
        axeScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(axeScanResults))
            .verifiable();
        deepScannerMock.setup((o) => o.runDeepScan(scanMetadata, pageScanResult, websiteScanResult, pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata, pageScanResult, websiteScanResult)).rejects.toThrowError('test error');
    });
});

function setupNavigatePage(urlParam: string = url, enableAuthentication: boolean = false): void {
    pageMock.setup((p) => p.navigate(urlParam, { enableAuthentication })).verifiable();
}

function setupClosePage(): void {
    pageMock.setup((p) => p.close()).verifiable();
}

function setupGetPageState(): void {
    pageMock
        .setup((o) => o.getPageScreenshot())
        .returns(() => Promise.resolve(pageScreenshot))
        .verifiable();
    pageMock
        .setup((o) => o.getPageSnapshot())
        .returns(() => Promise.resolve(pageSnapshot))
        .verifiable();
}
