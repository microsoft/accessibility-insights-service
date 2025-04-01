// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import {
    OnDemandPageScanRunResultProvider,
    WebsiteScanDataProvider,
    OperationResult,
    ReportWriter,
    ReportGeneratorRequestProvider,
    ScanNotificationProcessor,
    RunnerScanMetadata,
    GeneratedReport,
} from 'service-library';
import { GlobalLogger } from 'logger';
import * as MockDate from 'mockdate';
import {
    OnDemandPageScanResult,
    OnDemandPageScanReport,
    WebsiteScanData,
    OnDemandPageScanRunResult,
    ReportGeneratorRequest,
    OnDemandPageScanRunState,
    KnownPage,
} from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { System, ServiceConfiguration, ScanRunTimeConfig, GuidGenerator } from 'common';
import { AxeResults } from 'axe-core';
import { cloneDeep } from 'lodash';
import { RunnerScanMetadataConfig } from '../runner-scan-metadata-config';
import { PageScanProcessor } from '../processor/page-scan-processor';
import { ReportGenerator } from '../report-generator/report-generator';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { Runner } from './runner';

const maxFailedScanRetryCount = 1;

let scanMetadataConfigMock: IMock<RunnerScanMetadataConfig>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let pageScanProcessorMock: IMock<PageScanProcessor>;
let reportWriterMock: IMock<ReportWriter>;
let reportGeneratorMock: IMock<ReportGenerator>;
let scanNotificationProcessorMock: IMock<ScanNotificationProcessor>;
let scanRunnerTelemetryManagerMock: IMock<ScanRunnerTelemetryManager>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<GlobalLogger>;
let guidGeneratorMock: IMock<GuidGenerator>;
let reportGeneratorRequestProviderMock: IMock<ReportGeneratorRequestProvider>;
let runner: Runner;
let runnerScanMetadataInput: RunnerScanMetadata;
let runnerScanMetadata: RunnerScanMetadata;
let dateNow: Date;
let pageScanResultDbDocument: OnDemandPageScanResult;
let pageScanResult: OnDemandPageScanResult;
let axeScanResults: AxeScanResults;
let reports: OnDemandPageScanReport[];
let websiteScanDataDbDocument: WebsiteScanData;
let websiteScanDataDbDocumentUpdated: WebsiteScanData;

describe(Runner, () => {
    beforeEach(() => {
        scanMetadataConfigMock = Mock.ofType<RunnerScanMetadataConfig>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        pageScanProcessorMock = Mock.ofType<PageScanProcessor>();
        reportWriterMock = Mock.ofType<ReportWriter>();
        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        scanNotificationProcessorMock = Mock.ofType<ScanNotificationProcessor>();
        scanRunnerTelemetryManagerMock = Mock.ofType<ScanRunnerTelemetryManager>();
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType<GlobalLogger>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        reportGeneratorRequestProviderMock = Mock.ofType<ReportGeneratorRequestProvider>();

        dateNow = new Date();
        MockDate.set(dateNow);

        runnerScanMetadataInput = {
            id: 'scanMetadataId',
            url: 'https://localhost/support%20page/',
            deepScan: false,
        } as RunnerScanMetadata;
        runnerScanMetadata = {
            id: 'scanMetadataId',
            url: 'https://localhost/support page/',
            deepScan: false,
        } as RunnerScanMetadata;
        pageScanResultDbDocument = {
            id: runnerScanMetadata.id,
            websiteScanRef: {
                id: 'websiteScanId',
                scanGroupType: 'group-scan',
            },
            scannedUrl: 'scannedUrl',
            browserValidationResult: {},
        } as OnDemandPageScanResult;
        pageScanResult = {} as OnDemandPageScanResult;
        axeScanResults = {
            scannedUrl: 'scannedUrl',
            pageTitle: 'pageTitle',
            pageResponseCode: 200,
        } as AxeScanResults;
        reports = [{}] as OnDemandPageScanReport[];
        serviceConfigMock
            .setup(async (s) => s.getConfigValue('scanConfig'))
            .returns(async () => {
                return { maxFailedScanRetryCount } as ScanRunTimeConfig;
            })
            .verifiable();
        websiteScanDataDbDocument = { id: 'websiteScanId' } as WebsiteScanData;
        websiteScanDataDbDocumentUpdated = cloneDeep(websiteScanDataDbDocument);
        websiteScanDataProviderMock
            .setup((o) => o.read(pageScanResultDbDocument.websiteScanRef.id))
            .returns(() => Promise.resolve(websiteScanDataDbDocument));

        runner = new Runner(
            scanMetadataConfigMock.object,
            onDemandPageScanRunResultProviderMock.object,
            websiteScanDataProviderMock.object,
            reportGeneratorRequestProviderMock.object,
            pageScanProcessorMock.object,
            reportWriterMock.object,
            reportGeneratorMock.object,
            scanNotificationProcessorMock.object,
            scanRunnerTelemetryManagerMock.object,
            serviceConfigMock.object,
            guidGeneratorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        scanMetadataConfigMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
        reportGeneratorRequestProviderMock.verifyAll();
        pageScanProcessorMock.verifyAll();
        reportWriterMock.verifyAll();
        reportGeneratorMock.verifyAll();
        scanNotificationProcessorMock.verifyAll();
        scanRunnerTelemetryManagerMock.verifyAll();
        guidGeneratorMock.verifyAll();
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

    it('execute runner with sending generate combined report request', async () => {
        pageScanResultDbDocument.websiteScanRef.scanGroupId = 'scanGroupId';
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor();
        setupProcessScanResult();
        pageScanResult.run.state = 'report';
        setupUpdateScanResult();
        await runner.run();
    });

    it.each([true, false])(
        'execute runner with page scanner exception with useReportGeneratorWorkflow=%s',
        async (useReportGeneratorWorkflow) => {
            pageScanResultDbDocument.scannedUrl = undefined;
            pageScanResultDbDocument.websiteScanRef.scanGroupId = useReportGeneratorWorkflow ? 'scanGroupId' : undefined;
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
            await runner.run();
        },
    );

    it.each([true, false])(
        'handle scanner browser navigation error with useReportGeneratorWorkflow=%s',
        async (useReportGeneratorWorkflow: boolean) => {
            pageScanResultDbDocument.websiteScanRef.scanGroupId = useReportGeneratorWorkflow ? 'scanGroupId' : undefined;
            axeScanResults.error = 'browser navigation error';

            setupScanMetadataConfig();
            setupUpdateScanRunStateToRunning();
            setupScanRunnerTelemetryManager(true, false);
            setupPageScanProcessor();
            setupProcessScanResult();
            setupUpdateScanResult();
            await runner.run();
        },
    );

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
        await runner.run();
    });

    it('handle unscannable result', async () => {
        axeScanResults.unscannable = true;
        axeScanResults.error = 'Unscannable URL location';
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor(true, undefined);
        setupProcessScanResult();
        setupUpdateScanResult();
        await runner.run();
    });

    it('update website scan result if deep scan is enabled', async () => {
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager();
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        await runner.run();
    });

    it('update website scan result if deep scan is enabled and scan fail with retry available', async () => {
        axeScanResults.error = 'browser navigation error';
        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(true, false);
        setupPageScanProcessor();
        setupProcessScanResult();
        setupUpdateScanResult();
        await runner.run();
    });

    it('update website scan result if deep scan is enabled and scan fail with retry not available', async () => {
        axeScanResults.error = 'browser navigation error';
        pageScanResultDbDocument.run = {
            retryCount: maxFailedScanRetryCount,
        } as OnDemandPageScanRunResult;

        setupScanMetadataConfig();
        setupUpdateScanRunStateToRunning();
        setupScanRunnerTelemetryManager(true, false);
        setupPageScanProcessor();
        setupProcessScanResult();

        pageScanResult.run.retryCount = maxFailedScanRetryCount;
        setupUpdateScanResult();

        websiteScanDataDbDocumentUpdated.knownPages = [{ url: 'url1', runState: 'completed' }];
        setupScanNotificationProcessor();

        await runner.run();
    });
});

function setupReportGeneratorRequestProvider(): void {
    guidGeneratorMock
        .setup((o) => o.createGuidFromBaseGuid(runnerScanMetadata.id))
        .returns(() => 'guid')
        .verifiable();
    const reportGeneratorRequest: Partial<ReportGeneratorRequest> = {
        id: 'guid',
        scanId: pageScanResult.id,
        scanGroupId: pageScanResultDbDocument.websiteScanRef.scanGroupId,
        targetReport: 'accessibility',
        priority: pageScanResult.priority,
    };
    reportGeneratorRequestProviderMock.setup((o) => o.writeRequest(It.isValue(reportGeneratorRequest))).verifiable();
}

function setupScanNotificationProcessor(): void {
    scanNotificationProcessorMock
        .setup((o) => o.sendScanCompletionNotification(It.isValue(pageScanResult), It.isValue(websiteScanDataDbDocumentUpdated)))
        .verifiable();
}

function setupUpdateScanResult(): void {
    onDemandPageScanRunResultProviderMock.setup((o) => o.updateScanRun(It.isValue(pageScanResult))).verifiable();

    if (pageScanResult.websiteScanRef) {
        const runState =
            (['completed', 'unscannable'] as OnDemandPageScanRunState[]).includes(pageScanResult.run.state) ||
            pageScanResult.run.retryCount >= maxFailedScanRetryCount
                ? pageScanResult.run.state
                : undefined;
        const pageState: KnownPage = {
            scanId: runnerScanMetadata.id,
            url: runnerScanMetadata.url,
            scanState: pageScanResult.scanResult?.state,
            runState,
        };

        websiteScanDataProviderMock
            .setup((o) => o.updateKnownPages(websiteScanDataDbDocument, It.isValue([pageState])))
            .returns(() => Promise.resolve(websiteScanDataDbDocumentUpdated))
            .verifiable();
    }
}

function setupProcessScanResult(): void {
    if (axeScanResults.unscannable) {
        pageScanResult.run = {
            state: 'unscannable',
            timestamp: dateNow.toJSON(),
            error: axeScanResults.error,
        };
    } else if (axeScanResults.error) {
        pageScanResult.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error: axeScanResults.error,
        };
        loggerMock
            .setup((o) => o.logError(`Scanner has failed to scan a page.`, { error: JSON.stringify(axeScanResults.error) }))
            .verifiable();
    } else {
        pageScanResult.run = {
            state: 'report',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };
        pageScanResult.subRuns = {
            report: {
                state: 'pending',
                timestamp: new Date().toJSON(),
                error: null,
            },
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

        const generatedReports = [{ id: 'id', format: 'html', content: 'content' }] as GeneratedReport[];
        reportGeneratorMock
            .setup((o) => o.generateReports({ reportSource: 'accessibility-scan', ...axeScanResults }, It.isAny()))
            .returns(() => generatedReports)
            .verifiable();
        reportWriterMock
            .setup((o) => o.writeBatch(generatedReports))
            .returns(() => Promise.resolve(reports))
            .verifiable();

        setupReportGeneratorRequestProvider();
    }

    pageScanResult.run.pageTitle = axeScanResults.pageTitle;
    pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;
}

function setupPageScanProcessor(succeeded: boolean = true, error: Error = undefined): void {
    if (!succeeded) {
        axeScanResults.error = 'axe scan result error';
    }

    pageScanProcessorMock
        .setup((o) => o.scan(runnerScanMetadata, pageScanResultDbDocument, websiteScanDataDbDocument))
        .returns(() => {
            if (error) {
                return Promise.reject(error);
            }

            return Promise.resolve({ axeScanResults });
        })
        .verifiable();
}

function setupScanRunnerTelemetryManager(taskSucceeded: boolean = true, scanSucceeded: boolean = true): void {
    scanRunnerTelemetryManagerMock.setup((o) => o.trackScanStarted(runnerScanMetadata.id)).verifiable();
    scanRunnerTelemetryManagerMock.setup((o) => o.trackScanCompleted()).verifiable();
    if (!taskSucceeded) {
        scanRunnerTelemetryManagerMock.setup((o) => o.trackScanTaskFailed()).verifiable();
    }

    if (!scanSucceeded) {
        scanRunnerTelemetryManagerMock.setup((o) => o.trackBrowserScanFailed()).verifiable();
    }
}

function setupUpdateScanRunStateToRunning(succeeded: boolean = true): void {
    onDemandPageScanRunResultProviderMock
        .setup((o) => o.readScanRun(runnerScanMetadata.id))
        .returns(() => Promise.resolve(cloneDeep(pageScanResultDbDocument)))
        .verifiable();

    pageScanResult = { ...pageScanResult, ...pageScanResultDbDocument };
    const partialPageScanResult: Partial<OnDemandPageScanResult> = {
        id: runnerScanMetadata.id,
        run: {
            state: 'running',
            timestamp: dateNow.toJSON(),
            error: null,
            scanRunDetails: null,
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
        .returns(() => runnerScanMetadataInput)
        .verifiable();
    loggerMock.setup((o) => o.setCommonProperties({ scanId: runnerScanMetadata.id, url: runnerScanMetadata.url })).verifiable();
}
