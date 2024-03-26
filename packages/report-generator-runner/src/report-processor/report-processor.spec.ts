// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import * as MockDate from 'mockdate';
import { GlobalLogger } from 'logger';
import { TargetReport, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { QueuedRequest } from '../runner/request-selector';
import { ReportProcessor } from './report-processor';
import { AccessibilityReportProcessor } from './accessibility-report-processor';

let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let accessibilityReportProcessorMock: IMock<AccessibilityReportProcessor>;
let loggerMock: IMock<GlobalLogger>;
let dateNow: Date;
let reportProcessor: ReportProcessor;
let queuedRequests: QueuedRequest[];
let pageScanResults: OnDemandPageScanResult[];
let websiteScanDataList: WebsiteScanData[];
let websiteScanDataUpdatedList: WebsiteScanData[];

const targetReport: TargetReport = 'accessibility';
const maxFailedScanRetryCount = 1;
describe(ReportProcessor, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        accessibilityReportProcessorMock = Mock.ofType<AccessibilityReportProcessor>();
        loggerMock = Mock.ofType<GlobalLogger>();

        reportProcessor = new ReportProcessor(
            onDemandPageScanRunResultProviderMock.object,
            accessibilityReportProcessorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();

        onDemandPageScanRunResultProviderMock.verifyAll();
        accessibilityReportProcessorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('process report generation', async () => {
        generateSeedData();
        setupOnDemandPageScanRunResultProvider();
        setupAccessibilityReportProcessorMock();

        await reportProcessor.generate(targetReport, queuedRequests);
    });

    function generateSeedData(): void {
        queuedRequests = [];
        pageScanResults = [];
        websiteScanDataList = [];
        websiteScanDataUpdatedList = [];

        for (let i = 0; i < 3; i++) {
            const pageScanResult = {
                id: `id-${i}`,
                url: `url-${i}`,
                scanResult: {
                    state: 'pass',
                },
                run: {
                    retryCount: maxFailedScanRetryCount,
                },
                websiteScanRef: {
                    id: `websiteScanId-${i}`,
                    scanGroupType: 'deep-scan',
                },
            } as OnDemandPageScanResult;
            pageScanResults.push(pageScanResult);

            queuedRequests.push({
                condition: 'pending',
                error: undefined,
                request: {
                    id: `id-${i}`,
                    scanId: `scanId-${i}`,
                    scanGroupId: `scanGroupId-${i}`,
                },
            } as QueuedRequest);

            const websiteScanData = {
                id: pageScanResult.websiteScanRef.id,
            } as WebsiteScanData;
            websiteScanDataList.push(websiteScanData);

            websiteScanDataUpdatedList.push({
                ...websiteScanData,
                deepScanId: `deepScanId-${websiteScanData.id}`,
            });
        }
    }

    function setupOnDemandPageScanRunResultProvider(): void {
        queuedRequests.map((queuedRequest) => {
            const pageScanResult = pageScanResults.find((s) => s.id === queuedRequest.request.id);
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.readScanRun(queuedRequest.request.scanId))
                .returns(() => Promise.resolve(pageScanResult))
                .verifiable();
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.updateScanRun(pageScanResult))
                .returns(() => Promise.resolve(undefined))
                .verifiable();
        });
    }

    function setupAccessibilityReportProcessorMock(): void {
        queuedRequests.map((queuedRequest) => {
            const pageScanResult = pageScanResults.find((s) => s.id === queuedRequest.request.id);
            accessibilityReportProcessorMock
                .setup((o) => o.generate(It.isValue(pageScanResult), It.isValue(queuedRequest)))
                .returns(() => Promise.resolve(queuedRequest))
                .verifiable();
        });
    }
});
