// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, RetryHelper } from 'common';
import _ from 'lodash';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult } from 'scanner-global-library';
import {
    GeneratedReport,
    PrivacyReportReadResponse,
    PrivacyReportWriteResponse,
    PrivacyScanCombinedReportProvider,
    WebsiteScanResultProvider,
} from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    PrivacyPageScanReport,
    PrivacyScanCombinedReport,
    WebsiteScanResult,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { CombinedPrivacyScanResultProcessor } from './combined-privacy-scan-result-processor';
import { PrivacyReportReducer } from './privacy-report-reducer';

describe(CombinedPrivacyScanResultProcessor, () => {
    const reportId = 'report id';
    const pageScanReport = { HttpStatusCode: 200 } as PrivacyPageScanReport;
    const combinedReport = { Status: 'Completed' } as PrivacyScanCombinedReport;
    const privacyResults: PrivacyScanResult = {
        results: pageScanReport,
    };
    const onDemandPageScanReport: OnDemandPageScanReport = {
        reportId,
        format: 'consolidated.json',
        href: 'report href',
    };
    let websiteScanResult: WebsiteScanResult;
    let pageScanResult: OnDemandPageScanResult;

    let combinedReportProviderMock: IMock<PrivacyScanCombinedReportProvider>;
    let privacyReportReducerMock: IMock<PrivacyReportReducer>;
    let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
    let retryHelperMock: IMock<RetryHelper<void>>;
    let loggerMock: IMock<GlobalLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;

    let testSubject: CombinedPrivacyScanResultProcessor;

    beforeEach(() => {
        combinedReportProviderMock = Mock.ofType<PrivacyScanCombinedReportProvider>();
        privacyReportReducerMock = Mock.ofType<PrivacyReportReducer>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        loggerMock = Mock.ofType<GlobalLogger>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();

        websiteScanResult = {
            id: 'website scan result id',
            reports: [
                {
                    reportId,
                    format: 'consolidated.json',
                    href: 'report href',
                },
            ],
        } as WebsiteScanResult;
        pageScanResult = {
            id: 'page scan id',
            websiteScanRefs: [
                {
                    id: websiteScanResult.id,
                    scanGroupType: 'consolidated-scan-report',
                },
            ],
            url: 'scan url',
            reports: [
                {
                    reportId: 'page scan report id',
                    format: 'json',
                    href: 'page scan report href',
                },
            ],
        } as OnDemandPageScanResult;

        setupRetryHelperMock();

        testSubject = new CombinedPrivacyScanResultProcessor(
            combinedReportProviderMock.object,
            privacyReportReducerMock.object,
            websiteScanResultProviderMock.object,
            retryHelperMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
        );
    });

    afterEach(() => {
        combinedReportProviderMock.verifyAll();
        privacyReportReducerMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        retryHelperMock.verifyAll();
        guidGeneratorMock.verifyAll();
    });

    it('Does nothing if websiteScanRefs is undefined', async () => {
        pageScanResult.websiteScanRefs = undefined;

        websiteScanResultProviderMock.setup((w) => w.read(It.isAny())).verifiable(Times.never());

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);
    });

    it('Does nothing if websiteScanRefs is empty', async () => {
        pageScanResult.websiteScanRefs = [];

        websiteScanResultProviderMock.setup((w) => w.read(It.isAny())).verifiable(Times.never());

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);
    });

    it('Throws if blob read fails', () => {
        const errorReadResponse: PrivacyReportReadResponse = {
            error: {
                errorCode: 'jsonParseError',
            },
        };
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        combinedReportProviderMock
            .setup((c) => c.readCombinedReport(reportId))
            .returns(async () => errorReadResponse)
            .verifiable();

        expect(async () => testSubject.generateCombinedScanResults(privacyResults, pageScanResult)).rejects.toThrow();
    });

    it('Creates a new report if none exists', async () => {
        websiteScanResult.reports = undefined;
        guidGeneratorMock
            .setup((gg) => gg.createGuid())
            .returns(() => reportId)
            .verifiable();
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        combinedReportProviderMock.setup((c) => c.readCombinedReport(It.isAny())).verifiable(Times.never());
        setupCombineReports(undefined);
        setupWriteReport();
        setupUpdateWebsiteScanResult();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Creates a new report if blob is not found', async () => {
        const blobNotFoundResponse: PrivacyReportReadResponse = {
            error: {
                errorCode: 'blobNotFound',
            },
        };
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        combinedReportProviderMock.setup((c) => c.readCombinedReport(reportId)).returns(async () => blobNotFoundResponse);
        setupCombineReports(undefined);
        setupWriteReport();
        setupUpdateWebsiteScanResult();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Combines with existing combined report if it exists', async () => {
        const etag = 'etag';
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        setupReadReport(etag);
        setupCombineReports(combinedReport);
        setupWriteReport(etag);
        setupUpdateWebsiteScanResult();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Throws if report write fails', async () => {
        const errorWriteResponse: PrivacyReportWriteResponse = {
            error: {
                errorCode: 'etagMismatch',
            },
        };
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        setupReadReport('etag');
        setupCombineReports(combinedReport);
        combinedReportProviderMock
            .setup((c) => c.writeCombinedReport(It.isAny(), It.isAny()))
            .returns(async () => errorWriteResponse)
            .verifiable();
        websiteScanResultProviderMock.setup((w) => w.mergeOrCreate(It.isAny(), It.isAny())).verifiable(Times.never());

        expect(async () => testSubject.generateCombinedScanResults(privacyResults, pageScanResult)).rejects.toThrow();
    });

    it('Handles pageScanResult with undefined report array', async () => {
        pageScanResult.reports = undefined;
        const etag = 'etag';
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResult.id)).returns(async () => websiteScanResult);
        setupReadReport(etag);
        setupCombineReports(combinedReport);
        setupWriteReport(etag);
        setupUpdateWebsiteScanResult();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toBeDefined();
        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    function setupRetryHelperMock(): void {
        retryHelperMock
            .setup(async (o) => o.executeWithRetries(It.isAny(), It.isAny(), 5, 1000))
            .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, maxRetries: number) => action())
            .verifiable(Times.once());
    }

    function setupCombineReports(existingCombinedReport: PrivacyScanCombinedReport): void {
        privacyReportReducerMock
            .setup((r) =>
                r.reduceResults(privacyResults, existingCombinedReport, {
                    url: pageScanResult.url,
                    scanId: pageScanResult.id,
                    websiteScanId: websiteScanResult.id,
                }),
            )
            .returns(() => combinedReport);
    }

    function setupReadReport(etag: string): void {
        const readResponse: PrivacyReportReadResponse = {
            results: combinedReport,
            etag: etag,
        };
        combinedReportProviderMock
            .setup((c) => c.readCombinedReport(reportId))
            .returns(async () => readResponse)
            .verifiable();
    }

    function setupWriteReport(etag?: string): void {
        const generatedReport: GeneratedReport = {
            id: reportId,
            content: JSON.stringify(combinedReport),
            format: 'consolidated.json',
        };
        const writeResponse: PrivacyReportWriteResponse = {
            report: onDemandPageScanReport,
        };
        combinedReportProviderMock
            .setup((c) => c.writeCombinedReport(generatedReport, etag))
            .returns(async () => writeResponse)
            .verifiable();
    }

    function setupUpdateWebsiteScanResult(): void {
        websiteScanResultProviderMock
            .setup((w) => w.mergeOrCreate(pageScanResult.id, { id: websiteScanResult.id, reports: [onDemandPageScanReport] }))
            .verifiable();
    }
});
