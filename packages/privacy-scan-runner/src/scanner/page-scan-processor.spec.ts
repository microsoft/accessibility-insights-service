// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult, Page } from 'scanner-global-library';
import { System } from 'common';
import * as Puppeteer from 'puppeteer';
import { PrivacyScanner } from './privacy-scanner';
import { PageScanProcessor } from './page-scan-processor';

describe(PageScanProcessor, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageMock: IMock<Page>;
    let privacyScannerMock: IMock<PrivacyScanner>;
    let browserPageMock: IMock<Puppeteer.Page>;

    const url = 'url';
    const privacyScanResult = { scannedUrl: url } as PrivacyScanResult;

    let testSubject: PageScanProcessor;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        privacyScannerMock = Mock.ofType<PrivacyScanner>();
        browserPageMock = Mock.ofType<Puppeteer.Page>();

        testSubject = new PageScanProcessor(pageMock.object, privacyScannerMock.object, loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        pageMock.verifyAll();
        privacyScannerMock.verifyAll();
        browserPageMock.verifyAll();
    });

    it('run successful scan', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };

        setupOpenPage();
        setupClosePage();
        privacyScannerMock
            .setup((s) => s.scan(pageMock.object))
            .returns(() => Promise.resolve(privacyScanResult))
            .verifiable();

        const results = await testSubject.scan(scanMetadata);

        expect(results).toEqual(privacyScanResult);
    });

    it('returns error thrown by a scanner', async () => {
        const scanMetadata = {
            url: url,
            id: 'id',
        };
        const error = new Error('test error');

        setupOpenPage();
        setupClosePage();
        privacyScannerMock.setup((s) => s.scan(pageMock.object)).throws(error);

        await expect(testSubject.scan(scanMetadata)).rejects.toThrowError('test error');
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

        await testSubject.scan(scanMetadata);
    });

    function setupOpenPage(): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(url)).verifiable();
    }

    function setupClosePage(): void {
        pageMock.setup((p) => p.close()).verifiable();
    }
});
