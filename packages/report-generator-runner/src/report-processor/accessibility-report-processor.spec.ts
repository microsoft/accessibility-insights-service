// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { CombinedScanResultProcessor, PageScanRunReportProvider, ReportContent } from 'service-library';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, OnDemandPageScanReport } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { QueuedRequest } from '../runner/request-selector';
import { AccessibilityReportProcessor } from './accessibility-report-processor';

let combinedScanResultProcessorMock: IMock<CombinedScanResultProcessor>;
let pageScanRunReportProviderMock: IMock<PageScanRunReportProvider>;
let loggerMock: IMock<GlobalLogger>;
let accessibilityReportProcessor: AccessibilityReportProcessor;
let pageScanResult: OnDemandPageScanResult;
let queuedRequest: QueuedRequest;
let axeScanResults: AxeScanResults;
let axeReport: OnDemandPageScanReport;
let reportContent: ReportContent;

describe(AccessibilityReportProcessor, () => {
    beforeEach(() => {
        combinedScanResultProcessorMock = Mock.ofType<CombinedScanResultProcessor>();
        pageScanRunReportProviderMock = Mock.ofType<PageScanRunReportProvider>();
        loggerMock = Mock.ofType<GlobalLogger>();

        axeReport = {
            reportId: 'reportId',
            format: 'axe',
        } as OnDemandPageScanReport;

        pageScanResult = {
            id: 'id',
            reports: [axeReport],
        } as OnDemandPageScanResult;

        queuedRequest = {
            request: {
                scanGroupId: 'scanGroupId',
            },
        } as QueuedRequest;

        axeScanResults = {
            scannedUrl: 'scannedUrl',
        } as AxeScanResults;

        reportContent = {
            content: axeScanResults,
            errorCode: undefined,
        } as ReportContent;

        accessibilityReportProcessor = new AccessibilityReportProcessor(
            combinedScanResultProcessorMock.object,
            pageScanRunReportProviderMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        combinedScanResultProcessorMock.verifyAll();
        pageScanRunReportProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('generate accessibility report without source', async () => {
        setupCombinedScanResultProcessor();
        setupPageScanRunReportProvider();

        await accessibilityReportProcessor.generate(pageScanResult, queuedRequest);
    });

    it('generate accessibility report', async () => {
        pageScanResult.reports[0].source = 'accessibility-scan';
        setupCombinedScanResultProcessor();
        setupPageScanRunReportProvider();

        await accessibilityReportProcessor.generate(pageScanResult, queuedRequest);
    });

    it('generate accessibility agent combined report', async () => {
        pageScanResult.reports[0].source = 'accessibility-combined';
        setupCombinedScanResultProcessor();
        setupPageScanRunReportProvider();

        await accessibilityReportProcessor.generate(pageScanResult, queuedRequest);
    });

    it('generate report with blob read failure', async () => {
        reportContent = {
            content: axeScanResults,
            errorCode: 'blobNotFound',
            error: 'error',
        } as ReportContent;

        setupPageScanRunReportProvider();

        await expect(accessibilityReportProcessor.generate(pageScanResult, queuedRequest)).rejects.toThrowError(
            /Failure to read axe report blob. Report ID: reportId Error Code: blobNotFound Error: error/,
        );
    });

    function setupCombinedScanResultProcessor(): void {
        combinedScanResultProcessorMock
            .setup((o) => o.generateCombinedScanResults(It.isValue(axeScanResults), It.isValue(pageScanResult)))
            .returns(() => Promise.resolve())
            .verifiable();
    }

    function setupPageScanRunReportProvider(): void {
        pageScanRunReportProviderMock
            .setup((o) => o.readReportContent(axeReport.reportId))
            .returns(() => Promise.resolve(reportContent))
            .verifiable();
    }
});
