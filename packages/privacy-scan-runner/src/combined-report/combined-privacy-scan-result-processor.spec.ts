// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator, RetryHelper } from 'common';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult } from 'scanner-global-library';
import {
    GeneratedReport,
    PrivacyReportReadResponse,
    PrivacyReportWriteResponse,
    PrivacyScanCombinedReportProvider,
    WebsiteScanDataProvider,
} from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    PrivacyPageScanReport,
    PrivacyScanCombinedReport,
    WebsiteScanData,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { CombinedPrivacyScanResultProcessor } from './combined-privacy-scan-result-processor';
import { PrivacyReportReducer } from './privacy-report-reducer';

const reportId = 'report id';
const pageScanReport = { httpStatusCode: 200 } as PrivacyPageScanReport;
const combinedReport = { status: 'Completed' } as PrivacyScanCombinedReport;
const privacyResults: PrivacyScanResult = {
    results: pageScanReport,
};
const onDemandPageScanReport: OnDemandPageScanReport = {
    reportId,
    format: 'consolidated.json',
    href: 'report href',
};

let websiteScanData: WebsiteScanData;
let pageScanResult: OnDemandPageScanResult;
let combinedReportProviderMock: IMock<PrivacyScanCombinedReportProvider>;
let privacyReportReducerMock: IMock<PrivacyReportReducer>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let retryHelperMock: IMock<RetryHelper<void>>;
let loggerMock: IMock<GlobalLogger>;
let guidGeneratorMock: IMock<GuidGenerator>;

let testSubject: CombinedPrivacyScanResultProcessor;

describe(CombinedPrivacyScanResultProcessor, () => {
    beforeEach(() => {
        combinedReportProviderMock = Mock.ofType<PrivacyScanCombinedReportProvider>();
        privacyReportReducerMock = Mock.ofType<PrivacyReportReducer>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        loggerMock = Mock.ofType<GlobalLogger>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();

        websiteScanData = {
            id: 'website scan result id',
            reports: [
                {
                    reportId,
                    format: 'consolidated.json',
                    href: 'report href',
                },
            ],
        } as WebsiteScanData;
        pageScanResult = {
            id: 'page scan id',
            websiteScanRef: {
                id: websiteScanData.id,
                scanGroupType: 'consolidated-scan',
            },

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
            websiteScanDataProviderMock.object,
            retryHelperMock.object,
            loggerMock.object,
            guidGeneratorMock.object,
        );
    });

    afterEach(() => {
        combinedReportProviderMock.verifyAll();
        privacyReportReducerMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
        retryHelperMock.verifyAll();
        guidGeneratorMock.verifyAll();
    });

    it('Throws if blob read fails', async () => {
        const errorReadResponse: PrivacyReportReadResponse = {
            error: {
                errorCode: 'jsonParseError',
            },
        };
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        combinedReportProviderMock
            .setup((c) => c.readCombinedReport(reportId))
            .returns(async () => errorReadResponse)
            .verifiable();

        await expect(async () => testSubject.generateCombinedScanResults(privacyResults, pageScanResult)).rejects.toThrow();
    });

    it('Creates a new report if none exists', async () => {
        websiteScanData.reports = undefined;
        guidGeneratorMock
            .setup((gg) => gg.createGuid())
            .returns(() => reportId)
            .verifiable();
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        combinedReportProviderMock.setup((c) => c.readCombinedReport(It.isAny())).verifiable(Times.never());
        setupCombineReports(undefined);
        setupWriteReport();
        setupUpdateWebsiteScanData();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Creates a new report if blob is not found', async () => {
        const blobNotFoundResponse: PrivacyReportReadResponse = {
            error: {
                errorCode: 'blobNotFound',
            },
        };
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        combinedReportProviderMock.setup((c) => c.readCombinedReport(reportId)).returns(async () => blobNotFoundResponse);
        setupCombineReports(undefined);
        setupWriteReport();
        setupUpdateWebsiteScanData();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Combines with existing combined report if it exists', async () => {
        const etag = 'etag';
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        setupReadReport(etag);
        setupCombineReports(combinedReport);
        setupWriteReport(etag);
        setupUpdateWebsiteScanData();

        await testSubject.generateCombinedScanResults(privacyResults, pageScanResult);

        expect(pageScanResult.reports).toContain(onDemandPageScanReport);
    });

    it('Throws if report write fails', async () => {
        const errorWriteResponse: PrivacyReportWriteResponse = {
            error: {
                errorCode: 'etagMismatch',
            },
        };
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        setupReadReport('etag');
        setupCombineReports(combinedReport);
        combinedReportProviderMock
            .setup((c) => c.writeCombinedReport(It.isAny(), It.isAny()))
            .returns(async () => errorWriteResponse)
            .verifiable();
        websiteScanDataProviderMock.setup((w) => w.merge(It.isAny())).verifiable(Times.never());

        await expect(async () => testSubject.generateCombinedScanResults(privacyResults, pageScanResult)).rejects.toThrow();
    });

    it('Handles pageScanResult with undefined report array', async () => {
        pageScanResult.reports = undefined;
        const etag = 'etag';
        websiteScanDataProviderMock.setup((w) => w.read(websiteScanData.id)).returns(async () => websiteScanData);
        setupReadReport(etag);
        setupCombineReports(combinedReport);
        setupWriteReport(etag);
        setupUpdateWebsiteScanData();

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
                    websiteScanId: websiteScanData.id,
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

    function setupUpdateWebsiteScanData(): void {
        websiteScanDataProviderMock.setup((w) => w.merge({ id: websiteScanData.id, reports: [onDemandPageScanReport] })).verifiable();
    }
});
