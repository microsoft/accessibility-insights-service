// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import {
    OnDemandPageScanRunResultProvider,
    WebsiteScanResultProvider,
    ScanNotificationProcessor,
    RunnerScanMetadata,
} from 'service-library';
import { ServiceConfiguration, ScanRunTimeConfig, System } from 'common';
import * as MockDate from 'mockdate';
import { GlobalLogger } from 'logger';
import { TargetReport, OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { cloneDeep } from 'lodash';
import { QueuedRequest } from '../runner/request-selector';
import { ReportProcessor } from './report-processor';
import { AccessibilityReportProcessor } from './accessibility-report-processor';

let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let scanNotificationProcessorMock: IMock<ScanNotificationProcessor>;
let accessibilityReportProcessorMock: IMock<AccessibilityReportProcessor>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<GlobalLogger>;
let dateNow: Date;
let reportProcessor: ReportProcessor;
let queuedRequests: QueuedRequest[];
let pageScanResults: OnDemandPageScanResult[];
let pageScanResultsUpdated: OnDemandPageScanResult[];
let websiteScanResults: WebsiteScanResult[];
let websiteScanResultsUpdated: WebsiteScanResult[];

const targetReport: TargetReport = 'accessibility';
const maxFailedScanRetryCount = 1;
const errorMessage = 'Error while processing report generation';

describe(ReportProcessor, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        scanNotificationProcessorMock = Mock.ofType<ScanNotificationProcessor>();
        accessibilityReportProcessorMock = Mock.ofType<AccessibilityReportProcessor>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        loggerMock = Mock.ofType<GlobalLogger>();

        reportProcessor = new ReportProcessor(
            onDemandPageScanRunResultProviderMock.object,
            websiteScanResultProviderMock.object,
            scanNotificationProcessorMock.object,
            accessibilityReportProcessorMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();

        onDemandPageScanRunResultProviderMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        scanNotificationProcessorMock.verifyAll();
        accessibilityReportProcessorMock.verifyAll();
        serviceConfigMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('process report generation', async () => {
        generateSeedData();

        setupOnDemandPageScanRunResultProviderReadScanRun();
        setupAccessibilityReportProcessorMock();
        setupOnDemandPageScanRunResultProviderUpdateScanRun();
        setupWebsiteScanResultProviderMock();
        setupScanNotificationProcessorMock();

        await reportProcessor.generate(targetReport, queuedRequests);
    });

    it('process report generation with failure', async () => {
        generateSeedData(true);

        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => {
                return { maxFailedScanRetryCount } as ScanRunTimeConfig;
            })
            .verifiable(Times.exactly(pageScanResults.length));

        setupOnDemandPageScanRunResultProviderReadScanRun();
        setupAccessibilityReportProcessorMock();
        setupOnDemandPageScanRunResultProviderUpdateScanRun();
        setupWebsiteScanResultProviderMock();
        setupScanNotificationProcessorMock();

        await reportProcessor.generate(targetReport, queuedRequests);
    });

    function generateSeedData(injectFailure: boolean = false): void {
        queuedRequests = [];
        pageScanResults = [];
        pageScanResultsUpdated = [];
        websiteScanResults = [];
        websiteScanResultsUpdated = [];

        let injectFailureFlag = injectFailure;

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
                websiteScanRefs: [
                    {
                        id: `websiteScanId-${i}`,
                        scanGroupType: 'deep-scan',
                    },
                ],
            } as OnDemandPageScanResult;
            pageScanResults.push(pageScanResult);

            const pageScanResultUpdated = {
                ...pageScanResult,
                run: {
                    ...pageScanResult.run,
                    state: injectFailureFlag ? 'failed' : 'completed',
                    timestamp: new Date().toJSON(),
                    error: injectFailureFlag ? System.serializeError(errorMessage) : undefined,
                },
            } as OnDemandPageScanResult;
            pageScanResultsUpdated.push(pageScanResultUpdated);

            queuedRequests.push({
                condition: 'pending',
                error: undefined,
                request: {
                    id: `id-${i}`,
                    scanId: `scanId-${i}`,
                    scanGroupId: `scanGroupId-${i}`,
                },
            } as QueuedRequest);

            const websiteScanResult = {
                id: pageScanResult.websiteScanRefs[0].id,
                pageScans: [
                    {
                        scanId: pageScanResult.id,
                        url: pageScanResult.url,
                        scanState: pageScanResultUpdated.scanResult?.state,
                        runState: pageScanResultUpdated.run.state,
                        timestamp: new Date().toJSON(),
                    },
                ],
            } as WebsiteScanResult;
            websiteScanResults.push(websiteScanResult);

            websiteScanResultsUpdated.push({
                ...websiteScanResult,
                deepScanId: `deepScanId-${websiteScanResult.id}`,
            });

            injectFailureFlag = false; // inject failure once
        }
    }

    function setupWebsiteScanResultProviderMock(): void {
        pageScanResultsUpdated.map((r) => {
            const websiteScanResult = websiteScanResults.find((w) => r.id === w.pageScans[0].scanId);
            const websiteScanResultUpdated = websiteScanResultsUpdated.find((w) => w.id === websiteScanResult.id);
            websiteScanResultProviderMock
                .setup((o) => o.mergeOrCreate(r.id, websiteScanResult, It.isAny()))
                .callback((id, result, callback) => {
                    if (callback) {
                        callback(websiteScanResultUpdated);
                    }
                })
                .returns(() => Promise.resolve(websiteScanResultUpdated))
                .verifiable();
        });
    }

    function setupScanNotificationProcessorMock(): void {
        websiteScanResultsUpdated.map((websiteScanResultUpdated) => {
            const pageScanResultUpdated = pageScanResultsUpdated.find((r) => r.id === websiteScanResultUpdated.pageScans[0].scanId);
            const runnerScanMetadata = {
                id: pageScanResultUpdated.id,
                url: pageScanResultUpdated.url,
                deepScan: websiteScanResultUpdated.deepScanId !== undefined ? true : false,
            } as RunnerScanMetadata;
            const websiteScanResultUpdatedClone = cloneDeep(websiteScanResultUpdated);
            if (pageScanResultUpdated.run.state === 'completed') {
                websiteScanResultUpdatedClone.runResult = { completedScans: 1, failedScans: 0 };
            } else if (pageScanResultUpdated.run.state === 'failed') {
                websiteScanResultUpdatedClone.runResult = { completedScans: 0, failedScans: 1 };
            }
            scanNotificationProcessorMock
                .setup((o) =>
                    o.sendScanCompletionNotification(
                        It.isValue(runnerScanMetadata),
                        It.isValue(pageScanResultUpdated),
                        It.isValue(websiteScanResultUpdatedClone),
                    ),
                )
                .returns(() => Promise.resolve())
                .verifiable();
        });
    }

    function setupOnDemandPageScanRunResultProviderUpdateScanRun(): void {
        pageScanResults.map((pageScanResult) => {
            const pageScanResultUpdated = pageScanResultsUpdated.find((s) => s.id === pageScanResult.id);
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.updateScanRun(It.isValue(pageScanResultUpdated)))
                .returns(() => Promise.resolve(pageScanResultUpdated))
                .verifiable();
        });
    }

    function setupOnDemandPageScanRunResultProviderReadScanRun(): void {
        queuedRequests.map((queuedRequest) => {
            const pageScanResult = pageScanResults.find((s) => s.id === queuedRequest.request.id);
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.readScanRun(queuedRequest.request.scanId))
                .returns(() => Promise.resolve(pageScanResult))
                .verifiable();
        });
    }

    function setupAccessibilityReportProcessorMock(): void {
        queuedRequests.map((queuedRequest) => {
            const pageScanResult = pageScanResults.find((s) => s.id === queuedRequest.request.id);
            const pageScanResultUpdated = pageScanResultsUpdated.find((s) => s.id === queuedRequest.request.id);
            accessibilityReportProcessorMock
                .setup((o) => o.generate(It.isValue(pageScanResult), It.isValue(queuedRequest)))
                .returns(() =>
                    pageScanResultUpdated.run.state === 'failed' ? Promise.reject(errorMessage) : Promise.resolve(queuedRequest),
                )
                .verifiable();
        });
    }
});
