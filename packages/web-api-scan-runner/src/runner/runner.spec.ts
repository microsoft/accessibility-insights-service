// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { OnDemandPageScanRunResultProvider, WebsiteScanResultProvider, OperationResult } from 'service-library';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import { OnDemandPageScanResult, OnDemandPageScanReport, WebsiteScanResult, WebsiteScanRef } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { System } from 'common';
import { AxeResults } from 'axe-core';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { ReportWriter } from '../report-generator/report-writer';
import { ReportGenerator, GeneratedReport } from '../report-generator/report-generator';
import { CombinedScanResultProcessor } from '../combined-result/combined-scan-result-processor';
import { ScanNotificationProcessor } from '../sender/scan-notification-processor';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

let scanMetadataConfigMock: IMock<ScanMetadataConfig>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let WebsiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let pageScanProcessorMock: IMock<PageScanProcessor>;
let reportWriterMock: IMock<ReportWriter>;
let reportGeneratorMock: IMock<ReportGenerator>;
let combinedScanResultProcessorMock: IMock<CombinedScanResultProcessor>;
let scanNotificationProcessorMock: IMock<ScanNotificationProcessor>;
let scanRunnerTelemetryManagerMock: IMock<ScanRunnerTelemetryManager>;
let loggerMock: IMock<GlobalLogger>;
let runner: Runner;
let scanMetadata: ScanMetadata;
let dateNow: Date;
let pageScanResultDbDocument: OnDemandPageScanResult;
let pageScanResult: OnDemandPageScanResult;
let axeScanResults: AxeScanResults;
let reports: OnDemandPageScanReport[];
let websiteScanResult: WebsiteScanResult;

describe(Runner, () => {
    beforeEach(() => {
        scanMetadataConfigMock = Mock.ofType<ScanMetadataConfig>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        WebsiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        pageScanProcessorMock = Mock.ofType<PageScanProcessor>();
        reportWriterMock = Mock.ofType<ReportWriter>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        combinedScanResultProcessorMock = Mock.ofType<CombinedScanResultProcessor>();
        scanNotificationProcessorMock = Mock.ofType<ScanNotificationProcessor>();
        scanRunnerTelemetryManagerMock = Mock.ofType<ScanRunnerTelemetryManager>();
        loggerMock = Mock.ofType<GlobalLogger>();

        dateNow = new Date();
        MockDate.set(dateNow);

        scanMetadata = {
            id: 'scanMetadataId',
            url: 'url',
            deepScan: false,
        } as ScanMetadata;
        pageScanResultDbDocument = {} as OnDemandPageScanResult;
        pageScanResult = {} as OnDemandPageScanResult;
        axeScanResults = {
            scannedUrl: 'scannedUrl',
            pageTitle: 'pageTitle',
            pageResponseCode: 200,
        } as AxeScanResults;
        reports = [{}] as OnDemandPageScanReport[];

        runner = new Runner(
            scanMetadataConfigMock.object,
            onDemandPageScanRunResultProviderMock.object,
            WebsiteScanResultProviderMock.object,
            pageScanProcessorMock.object,
            reportWriterMock.object,
            reportGeneratorMock.object,
            combinedScanResultProcessorMock.object,
            scanNotificationProcessorMock.object,
            scanRunnerTelemetryManagerMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        scanMetadataConfigMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        WebsiteScanResultProviderMock.verifyAll();
        pageScanProcessorMock.verifyAll();
        reportWriterMock.verifyAll();
        reportGeneratorMock.verifyAll();
        combinedScanResultProcessorMock.verifyAll();
        scanNotificationProcessorMock.verifyAll();
        scanRunnerTelemetryManagerMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('exit runner if unable to update db document state to `running`', async () => {
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning(false);
        await runner.run();
    });

    it('execute runner with success', async () => {
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        setupScanNotificationProcessor();
        await runner.run();
    });

    it('execute runner with page scanner exception', async () => {
        const error = new Error('page scan processor error');
        const errorMessage = System.serializeError(error);
        pageScanResult.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error: errorMessage.substring(0, 2048),
        };
        loggerMock.setup((o) => o.logError(`The scanner failed to scan a page.`, { error: errorMessage })).verifiable();

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(false);
        setupPageScanProcessor(true, error);
        setupUpdateScanResult();
        setupScanNotificationProcessor();
        await runner.run();
    });

    it('handle scanner browser navigation error', async () => {
        axeScanResults.error = 'browser navigation error';

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(true, false);
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        setupScanNotificationProcessor();
        await runner.run();
    });

    it('handle scan result violations', async () => {
        axeScanResults.results = {
            violations: [
                {
                    nodes: [{}],
                },
                {
                    nodes: [{}, {}],
                },
            ],
        } as AxeResults;

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        setupScanNotificationProcessor();
        await runner.run();
    });

    it('update website scan result if deep scan is enabled', async () => {
        pageScanResultDbDocument.websiteScanRefs = [
            {
                id: 'websiteScanRefId',
                scanGroupType: 'deep-scan',
            },
        ] as WebsiteScanRef[];

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        setupScanNotificationProcessor();
        await runner.run();
    });
});

function setupScanNotificationProcessor(): void {
    scanNotificationProcessorMock
        .setup((o) => o.sendScanCompletionNotification(It.isValue(scanMetadata), It.isValue(pageScanResult), It.isValue(websiteScanResult)))
        .verifiable();
}

function setupUpdateScanResult(): void {
    onDemandPageScanRunResultProviderMock.setup((o) => o.updateScanRun(It.isValue(pageScanResult))).verifiable();

    const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
    if (websiteScanRef) {
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanRef.id,
            pageScans: [
                {
                    scanId: scanMetadata.id,
                    url: scanMetadata.url,
                    scanState: pageScanResult.scanResult.state,
                    runState: pageScanResult.run.state,
                    timestamp: dateNow.toJSON(),
                },
            ],
        };
        websiteScanResult = {
            id: 'websiteScanResultId',
        } as WebsiteScanResult;
        WebsiteScanResultProviderMock.setup((o) => o.mergeOrCreate(scanMetadata.id, It.isValue(updatedWebsiteScanResult), true))
            .returns(() => Promise.resolve(websiteScanResult))
            .verifiable();
    }
}

function setupProcessScanResult(): void {
    if (axeScanResults.error) {
        pageScanResult.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error: axeScanResults.error,
        };
        loggerMock
            .setup((o) => o.logError(`Browser has failed to scan a page.`, { error: JSON.stringify(axeScanResults.error) }))
            .verifiable();
    } else {
        pageScanResult.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };
        pageScanResult.reports = reports;
        pageScanResult.scannedUrl = axeScanResults.scannedUrl;

        if (axeScanResults.results) {
            pageScanResult.scanResult = {
                state: 'fail',
                issueCount: axeScanResults.results.violations.reduce((a, b) => a + b.nodes.length, 0),
            };
        } else {
            pageScanResult.scanResult = {
                state: 'pass',
            };
        }

        const generatedReports = [{}] as GeneratedReport[];
        reportGeneratorMock
            .setup((o) => o.generateReports(axeScanResults))
            .returns(() => generatedReports)
            .verifiable();
        reportWriterMock
            .setup((o) => o.writeBatch(generatedReports))
            .returns(() => Promise.resolve(reports))
            .verifiable();
        combinedScanResultProcessorMock
            .setup((o) => o.generateCombinedScanResults(It.isValue(axeScanResults), It.isValue(pageScanResult)))
            .verifiable();
    }

    pageScanResult.run.pageTitle = axeScanResults.pageTitle;
    pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;
}

function setupPageScanProcessor(succeeded: boolean = true, error: Error = undefined): void {
    if (!succeeded) {
        axeScanResults.error = 'axe scan result error';
    }

    pageScanProcessorMock
        .setup((o) => o.scan(scanMetadata, pageScanResultDbDocument))
        .returns(() => {
            if (error) {
                return Promise.reject(error);
            }

            return Promise.resolve(axeScanResults);
        })
        .verifiable();
}

function setupScanRunnerTelemetryManager(taskSucceeded: boolean = true, scanSucceeded: boolean = true): void {
    scanRunnerTelemetryManagerMock.setup((o) => o.trackScanStarted(scanMetadata.id)).verifiable();
    scanRunnerTelemetryManagerMock.setup((o) => o.trackScanCompleted()).verifiable();
    if (!taskSucceeded) {
        scanRunnerTelemetryManagerMock.setup((o) => o.trackScanTaskFailed()).verifiable();
    }

    if (!scanSucceeded) {
        scanRunnerTelemetryManagerMock.setup((o) => o.trackBrowserScanFailed()).verifiable();
    }
}

function setupUpdateScanRunStateToRunning(succeeded: boolean = true): void {
    pageScanResult = { ...pageScanResult, ...pageScanResultDbDocument };
    const partialPageScanResult: Partial<OnDemandPageScanResult> = {
        id: scanMetadata.id,
        run: {
            state: 'running',
            timestamp: dateNow.toJSON(),
            error: null,
        },
        scanResult: null,
        reports: null,
    };

    onDemandPageScanRunResultProviderMock
        .setup((o) => o.tryUpdateScanRun(It.isValue(partialPageScanResult)))
        .returns(() => {
            const response = {
                succeeded,
                result: pageScanResultDbDocument,
            } as OperationResult<OnDemandPageScanResult>;

            return Promise.resolve(response);
        })
        .verifiable();

    if (!succeeded) {
        loggerMock
            .setup((o) =>
                o.logWarn(
                    `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
                ),
            )
            .verifiable();
    }
}

function setupScanMetadataConfig(): void {
    scanMetadataConfigMock
        .setup((o) => o.getConfig())
        .returns(() => scanMetadata)
        .verifiable();
    loggerMock.setup((o) => o.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url })).verifiable();
}
