// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page, BrowserError, ResourceAuthenticationResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { cloneDeep } from 'lodash';
import { PageMetadata, PageMetadataGenerator } from 'service-library';
import { ScannerDispatcher } from '../scanner/scanner-dispatcher';
import { PageScanProcessor } from './page-scan-processor';

/* eslint-disable @typescript-eslint/no-explicit-any */

let loggerMock: IMock<GlobalLogger>;
let pageMock: IMock<Page>;
let pageMetadataGeneratorMock: IMock<PageMetadataGenerator>;
let scannerDispatcherMock: IMock<ScannerDispatcher>;
let testSubject: PageScanProcessor;
let axeScanResults: AxeScanResults;
let pageScanResult: OnDemandPageScanResult;
let websiteScanData: WebsiteScanData;
let pageMetadata: PageMetadata;

const url = 'http://localhost';
const pageScreenshot = 'page screenshot';
const pageSnapshot = 'page snapshot';
const generatedDiscoveryPattern = `^http(s?)://localhost(.*)`;

describe(PageScanProcessor, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        pageMetadataGeneratorMock = Mock.ofType<PageMetadataGenerator>();
        scannerDispatcherMock = Mock.ofType<ScannerDispatcher>();
        axeScanResults = { scannedUrl: url } as AxeScanResults;
        pageScanResult = { id: 'id' } as OnDemandPageScanResult;
        websiteScanData = {} as WebsiteScanData;
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
            pageMetadataGeneratorMock.object,
            scannerDispatcherMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        pageMetadataGeneratorMock.verifyAll();
        scannerDispatcherMock.verifyAll();
    });

    it('skip page scan for forbidden location', async () => {
        const loadedUrl = 'http://example.org';
        const browserError = {
            errorType: 'UnsupportedResource',
            message: 'error message',
        };
        pageMetadata = {
            allowed: false,
            loadedUrl,
            browserError,
        } as PageMetadata;
        websiteScanData = { discoveryPatterns: [generatedDiscoveryPattern] } as WebsiteScanData;
        const scanMetadata = {
            url,
            id: 'id',
            deepScan: true,
        };
        axeScanResults = {
            unscannable: true,
            scannedUrl: loadedUrl,
            error: pageMetadata.browserError,
        };
        pageMetadataGeneratorMock.reset();
        pageMetadataGeneratorMock
            .setup((o) => o.getMetadata(url, pageMock.object, websiteScanData))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();
        setupClosePage();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results.axeScanResults).toEqual(axeScanResults);
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
            .setup((o) => o.getMetadata(url, pageMock.object, websiteScanData))
            .returns(() => Promise.resolve(pageMetadata))
            .verifiable();

        setupReopenBrowser();
        setupNavigatePage(url, true);
        setupClosePage();

        pageScanResult = {
            ...pageScanResult,
            authentication: {
                hint: 'entraId',
            },
        };
        const authenticationResult = {
            authenticationType: 'entraId',
            authenticated: true,
        } as ResourceAuthenticationResult;
        pageMock
            .setup((p) => p.authenticationResult)
            .returns(() => authenticationResult)
            .verifiable();
        const expectedPageScanResult = cloneDeep({
            ...pageScanResult,
            authentication: {
                detected: 'entraId',
                state: 'succeeded',
                hint: 'entraId',
            },
        });
        scannerDispatcherMock
            .setup((s) => s.dispatch(scanMetadata, expectedPageScanResult as any, websiteScanData, pageMock.object))
            .returns(() => Promise.resolve({ axeScanResults }))
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(pageScanResult).toEqual(expectedPageScanResult);
        expect(results.axeScanResults).toEqual(axeScanResults);
    });

    it('scans successfully when deep scan is enabled', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
            deepScan: true,
        };
        axeScanResults = { ...axeScanResults, pageScreenshot, pageSnapshot };

        setupReopenBrowser();
        setupNavigatePage();
        setupClosePage();
        scannerDispatcherMock
            .setup((s) => s.dispatch(scanMetadata, pageScanResult, websiteScanData, pageMock.object))
            .returns(() => Promise.resolve({ axeScanResults }))
            .verifiable();

        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results.axeScanResults).toEqual(axeScanResults);
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
        const results = await testSubject.scan(scanMetadata, pageScanResult, websiteScanData);

        expect(results.axeScanResults).toEqual(expectedResult);
    });
});

function setupReopenBrowser(): void {
    pageMock.setup((p) => p.reopenBrowser({ capabilities: { webgl: true } })).verifiable();
}

function setupNavigatePage(urlParam: string = url, enableAuthentication: boolean = false): void {
    pageMock.setup((p) => p.navigate(urlParam, { enableAuthentication })).verifiable();
}

function setupClosePage(): void {
    pageMock.setup((p) => p.close()).verifiable();
}
