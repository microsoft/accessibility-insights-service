// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import {
    OnDemandPageScanRunResultProvider,
    WebsiteScanResultProvider,
    OperationResult,
    ReportWriter,
    GeneratedReport,
} from 'service-library';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import { OnDemandPageScanResult, OnDemandPageScanReport, WebsiteScanResult } from 'storage-documents';
import { PrivacyScanResult } from 'scanner-global-library';
import { System, ServiceConfiguration, ScanRunTimeConfig } from 'common';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { Runner } from './runner';

const maxFailedScanRetryCount = 1;

let scanMetadataConfigMock: IMock<ScanMetadataConfig>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let pageScanProcessorMock: IMock<PageScanProcessor>;
let reportWriterMock: IMock<ReportWriter>;
let scanRunnerTelemetryManagerMock: IMock<ScanRunnerTelemetryManager>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<GlobalLogger>;
let runner: Runner;
let scanMetadataInput: PrivacyScanMetadata;
let scanMetadata: PrivacyScanMetadata;
let dateNow: Date;
let pageScanResultDbDocument: OnDemandPageScanResult;
let pageScanResult: OnDemandPageScanResult;
let privacyScanResults: PrivacyScanResult;
let reports: OnDemandPageScanReport[];
let websiteScanResult: WebsiteScanResult;

describe(Runner, () => {
    beforeEach(() => {
        scanMetadataConfigMock = Mock.ofType<ScanMetadataConfig>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        pageScanProcessorMock = Mock.ofType<PageScanProcessor>();
        reportWriterMock = Mock.ofType<ReportWriter>();
        scanRunnerTelemetryManagerMock = Mock.ofType<ScanRunnerTelemetryManager>();
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType<GlobalLogger>();

        dateNow = new Date();
        MockDate.set(dateNow);

        scanMetadataInput = {
            id: 'scanMetadataId',
            url: 'https://localhost/support%20page/',
        } as PrivacyScanMetadata;
        scanMetadata = {
            id: 'scanMetadataId',
            url: 'https://localhost/support page/',
        } as PrivacyScanMetadata;
        pageScanResultDbDocument = {} as OnDemandPageScanResult;
        pageScanResult = {} as OnDemandPageScanResult;
        privacyScanResults = {
            scannedUrl: 'scannedUrl',
            pageResponseCode: 200,
        } as PrivacyScanResult;
        reports = [{}] as OnDemandPageScanReport[];
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => {
                return { maxFailedScanRetryCount } as ScanRunTimeConfig;
            })
            .verifiable();

        runner = new Runner(
            scanMetadataConfigMock.object,
            onDemandPageScanRunResultProviderMock.object,
            websiteScanResultProviderMock.object,
            pageScanProcessorMock.object,
            reportWriterMock.object,
            scanRunnerTelemetryManagerMock.object,
            serviceConfigMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        scanMetadataConfigMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        pageScanProcessorMock.verifyAll();
        reportWriterMock.verifyAll();
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
        loggerMock.setup((o) => o.logError(`The privacy scan processor failed to scan a webpage.`, { error: errorMessage })).verifiable();

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(false);
        setupPageScanProcessor(true, error);
        setupUpdateScanResult();
        await runner.run();
    });

    it('handle scanner browser navigation error', async () => {
        privacyScanResults.error = 'browser navigation error';

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(true, false);
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        await runner.run();
    });
});

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
                    scanState: pageScanResult.scanResult?.state,
                    runState:
                        pageScanResult.run.state === 'failed' &&
                        (pageScanResult.run.retryCount === undefined || pageScanResult.run.retryCount < maxFailedScanRetryCount)
                            ? undefined
                            : pageScanResult.run.state,
                    timestamp: dateNow.toJSON(),
                },
            ],
        };
        websiteScanResult = {
            id: 'websiteScanResultId',
        } as WebsiteScanResult;
        websiteScanResultProviderMock
            .setup((o) => o.mergeOrCreate(scanMetadata.id, It.isValue(updatedWebsiteScanResult), true))
            .returns(() => Promise.resolve(websiteScanResult))
            .verifiable();
    }
}

function setupProcessScanResult(): void {
    if (privacyScanResults.error) {
        pageScanResult.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error: privacyScanResults.error,
        };
        loggerMock
            .setup((o) => o.logError(`Browser has failed to scan a webpage.`, { error: JSON.stringify(privacyScanResults.error) }))
            .verifiable();
    } else {
        pageScanResult.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };
        pageScanResult.reports = reports;
        pageScanResult.scannedUrl = privacyScanResults.scannedUrl;

        if (privacyScanResults.results) {
            pageScanResult.scanResult = {
                state: 'fail',
            };
        } else {
            pageScanResult.scanResult = {
                state: 'pass',
            };
        }

        const generatedReports = [{}] as GeneratedReport[];
        reportWriterMock
            .setup((o) => o.writeBatch(generatedReports))
            .returns(() => Promise.resolve(reports))
            .verifiable();
    }

    pageScanResult.run.pageResponseCode = privacyScanResults.pageResponseCode;
}

function setupPageScanProcessor(succeeded: boolean = true, error: Error = undefined): void {
    if (!succeeded) {
        privacyScanResults.error = 'scan error';
    }

    pageScanProcessorMock
        .setup((o) => o.scan(scanMetadata))
        .returns(() => {
            if (error) {
                return Promise.reject(error);
            }

            return Promise.resolve(privacyScanResults);
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
                    `Update webpage scan run state to 'running' failed due to merge conflict with other process. Exiting webpage scan task.`,
                ),
            )
            .verifiable();
    }
}

function setupScanMetadataConfig(): void {
    scanMetadataConfigMock
        .setup((o) => o.getConfig())
        .returns(() => scanMetadataInput)
        .verifiable();
    loggerMock.setup((o) => o.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url })).verifiable();
}
