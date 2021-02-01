// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { FeatureFlags, GuidGenerator, ServiceConfiguration, System, RetryHelper } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import * as MockDate from 'mockdate';
import { AxeScanResults, Page } from 'scanner-global-library';
import {
    CombinedScanResultsProvider,
    OnDemandPageScanRunResultProvider,
    PageScanRunReportProvider,
    WebsiteScanResultProvider,
    CombinedScanResultsWriteResponse,
    CombinedScanResultsReadResponse,
} from 'service-library';
import {
    ItemType,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanState,
    WebsiteScanRef,
    WebsiteScanResult,
    CombinedScanResults,
} from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { AxeResultsReducer } from 'axe-result-converter';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { Scanner } from '../scanner/scanner';
import { NotificationQueueMessageSender } from '../sender/notification-queue-message-sender';
import { ScanMetadata } from '../types/scan-metadata';
import { DeepScanner } from '../crawl-runner/deep-scanner';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { Runner } from './runner';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

class MockableLogger extends Logger {}

describe(Runner, () => {
    let runner: Runner;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let scannerMock: IMock<Scanner>;
    let scanMetadataConfig: IMock<ScanMetadataConfig>;
    let loggerMock: IMock<MockableLogger>;
    let pageScanRunReportProviderMock: IMock<PageScanRunReportProvider>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let notificationQueueMessageSenderMock: IMock<NotificationQueueMessageSender>;
    let websiteScanResultsProviderMock: IMock<WebsiteScanResultProvider>;
    let combinedScanResultsProviderMock: IMock<CombinedScanResultsProvider>;
    let axeResultsReducerMock: IMock<AxeResultsReducer>;
    let retryHelperMock: IMock<RetryHelper<void>>;
    let pageMock: IMock<Page>;
    let deepScannerMock: IMock<DeepScanner>;
    let telemetryManagerMock: IMock<ScanRunnerTelemetryManager>;

    let scanMetadata: ScanMetadata;
    const onDemandPageScanResult: OnDemandPageScanResult = {
        url: 'url',
        scanResult: null,
        reports: null,
        run: {
            state: 'queued' as OnDemandPageScanRunState,
            timestamp: 'timestamp',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        id: 'id',
        partitionKey: 'item-partitionKey',
        batchRequestId: 'batch-id',
    };

    const pageTitle = 'page title';
    const pageResponseCode = 101;

    const passedAxeScanResults: AxeScanResults = {
        results: {
            url: 'url',
            timestamp: 'timestamp',
            passes: [],
            violations: [],
            incomplete: [],
            inapplicable: [],
        } as AxeResults,
        unscannable: false,
        pageTitle: pageTitle,
        pageResponseCode: pageResponseCode,
        userAgent: 'userAgent',
        browserResolution: '1920x1080',
    };

    const unscannableAxeScanResults: AxeScanResults = {
        unscannable: true,
        error: 'test scan error - not a valid page',
        pageResponseCode: pageResponseCode,
        pageTitle: pageTitle,
    };

    const reportId1 = 'report guid 1';
    const reportId2 = 'report guid 2';

    const generatedReport1: GeneratedReport = {
        content: 'test report content 1',
        format: 'sarif',
        id: reportId1,
    };
    const generatedReport2: GeneratedReport = {
        content: 'test report content 2',
        format: 'html',
        id: reportId2,
    };

    const onDemandReport1: OnDemandPageScanReport = {
        format: generatedReport1.format,
        reportId: reportId1,
        href: 'report blob path 1',
    };
    const onDemandReport2: OnDemandPageScanReport = {
        format: generatedReport2.format,
        reportId: reportId2,
        href: 'report blob path 2',
    };

    const axeScanResultsWithViolations: AxeScanResults = {
        results: {
            url: 'url',
            timestamp: 'timestamp',
            passes: [],
            violations: [
                {
                    description: 'rule with 2 violations',
                    nodes: [{}, {}],
                },
                {
                    description: 'rule with one violation',
                    nodes: [{}],
                },
            ],
            incomplete: [],
            inapplicable: [],
        } as AxeResults,
        unscannable: false,
        pageTitle: pageTitle,
        pageResponseCode: pageResponseCode,
    };

    const scanSubmittedDate = new Date(1, 2, 3, 4);
    let dateNow: Date;

    beforeEach(() => {
        scanMetadata = {
            id: 'id',
            url: 'url',
        };
        loggerMock = Mock.ofType(MockableLogger);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
        scannerMock = Mock.ofType<Scanner>();
        pageMock = Mock.ofType<Page>();
        scanMetadataConfig.setup((s) => s.getConfig()).returns(() => scanMetadata);
        pageScanRunReportProviderMock = Mock.ofType(PageScanRunReportProvider, MockBehavior.Strict);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        setupGuidGenerator();
        dateNow = new Date(2019, 2, 3);
        MockDate.set(dateNow);

        reportGeneratorMock = Mock.ofType<ReportGenerator>();
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        notificationQueueMessageSenderMock = Mock.ofType(NotificationQueueMessageSender, MockBehavior.Strict);
        websiteScanResultsProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        combinedScanResultsProviderMock = Mock.ofType<CombinedScanResultsProvider>();
        axeResultsReducerMock = Mock.ofType<AxeResultsReducer>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        deepScannerMock = Mock.ofType<DeepScanner>();
        telemetryManagerMock = Mock.ofType(ScanRunnerTelemetryManager, MockBehavior.Strict);

        const featureFlags: FeatureFlags = { sendNotification: false };
        serviceConfigurationMock
            .setup(async (scm) => scm.getConfigValue('featureFlags'))
            .returns(async () => Promise.resolve(featureFlags))
            .verifiable(Times.once());

        runner = new Runner(
            guidGeneratorMock.object,
            scanMetadataConfig.object,
            scannerMock.object,
            onDemandPageScanRunResultProviderMock.object,
            loggerMock.object,
            pageScanRunReportProviderMock.object,
            reportGeneratorMock.object,
            serviceConfigurationMock.object,
            notificationQueueMessageSenderMock.object,
            websiteScanResultsProviderMock.object,
            combinedScanResultsProviderMock.object,
            axeResultsReducerMock.object,
            retryHelperMock.object,
            pageMock.object,
            deepScannerMock.object,
            telemetryManagerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        guidGeneratorMock.verifyAll();
        scanMetadataConfig.verifyAll();
        scannerMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        loggerMock.verifyAll();
        pageScanRunReportProviderMock.verifyAll();
        reportGeneratorMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        notificationQueueMessageSenderMock.verifyAll();
        websiteScanResultsProviderMock.verifyAll();
        combinedScanResultsProviderMock.verifyAll();
        axeResultsReducerMock.verifyAll();
        retryHelperMock.verifyAll();
        pageMock.verifyAll();
        telemetryManagerMock.verifyAll();
    });

    it('sets job state to failed if axe scanning was unsuccessful', async () => {
        setupTelemetryWithBrowserError();
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScan(unscannableAxeScanResults);

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(unscannableAxeScanResults.error));

        await runner.run();
    });

    it('sets job state to failed if scanner throws', async () => {
        setupTelemetryWithTaskFailure();
        const failureMessage = 'scanner task failed message';
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScanWithException(failureMessage);

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(System.serializeError(failureMessage), false));

        await runner.run();
    });

    it('skip task run when database state lock conflict', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), {}, false);
        serviceConfigurationMock.reset();
        loggerMock
            .setup((o) =>
                o.logWarn(
                    `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
                ),
            )
            .verifiable();

        await runner.run();
    });

    it('sets scan status to pass if violation length = 0', async () => {
        setupBasicTelemetry();
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScan(passedAxeScanResults);

        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('return redirected url', async () => {
        setupBasicTelemetry();
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        const clonedPassedAxeScanResults = cloneDeep(passedAxeScanResults);
        clonedPassedAxeScanResults.scannedUrl = 'redirect url';
        setupPageScan(clonedPassedAxeScanResults);

        setupGenerateReportsCall(clonedPassedAxeScanResults);
        setupSaveAllReportsCall();
        const scanResultWithNoViolations = getScanResultWithNoViolations();
        scanResultWithNoViolations.scannedUrl = clonedPassedAxeScanResults.scannedUrl;
        setupUpdateScanRunResultCall(scanResultWithNoViolations);

        await runner.run();
    });

    it('sets scan status to fail if violation length > 0', async () => {
        setupBasicTelemetry();
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScan(axeScanResultsWithViolations);

        setupGenerateReportsCall(axeScanResultsWithViolations);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithViolations());

        await runner.run();
    });

    it('sends telemetry event on successful scan', async () => {
        setupBasicTelemetry();

        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScan(passedAxeScanResults);
        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        const scanResult = getScanResultWithNoViolations();
        setupUpdateScanRunResultCall(scanResult);

        await runner.run();
    });

    it('sends telemetry event on scan error', async () => {
        setupTelemetryWithBrowserError();

        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupPageScan(unscannableAxeScanResults);
        setupGenerateReportsCall(unscannableAxeScanResults);
        const scanResult = getFailingJobStateScanResult(unscannableAxeScanResults.error);
        setupUpdateScanRunResultCall(scanResult);

        await runner.run();
    });

    describe('enqueue notification, send notification feature flag is enabled', () => {
        const scanNotifyUrl = 'notify-url';
        const notificationMessage: OnDemandNotificationRequestMessage = {
            scanId: onDemandPageScanResult.id,
            scanNotifyUrl: scanNotifyUrl,
        } as OnDemandNotificationRequestMessage;

        beforeEach(() => {
            const featureFlags: FeatureFlags = { sendNotification: true };
            serviceConfigurationMock.reset();
            serviceConfigurationMock
                .setup(async (scm) => scm.getConfigValue('featureFlags'))
                .returns(async () => Promise.resolve(featureFlags))
                .verifiable(Times.once());
        });

        describe('on run completed', () => {
            beforeEach(() => {
                notificationMessage.runStatus = 'completed';
                setupBasicTelemetry();
                setupGenerateReportsCall(passedAxeScanResults);
                setupSaveAllReportsCall();
            });

            test.each([undefined, { scanNotifyUrl: undefined }])(
                'Do not send notification when url not present, notification = %o',
                async (notification) => {
                    notificationMessage.scanStatus = 'pass';
                    setupPageScan(passedAxeScanResults);

                    setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), { notification });
                    setupUpdateScanRunResultCall({ ...getScanResultWithNoViolations(), notification });
                    setupSendNotificationMessageNeverCalled();

                    await runner.run();
                },
            );

            test.each([
                ['fail', axeScanResultsWithViolations],
                ['pass', passedAxeScanResults],
            ])('Notification url is not null - scan status - %s', async (scanStatus: ScanState, scanResults) => {
                notificationMessage.scanStatus = scanStatus;
                setupPageScan(scanResults);

                setupGenerateReportsCall(scanResults);
                setupSaveAllReportsCall();
                setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), { notification: { scanNotifyUrl: scanNotifyUrl } });
                const updatePageScanResult = scanStatus === 'pass' ? getScanResultWithNoViolations() : getScanResultWithViolations();
                setupUpdateScanRunResultCall({ ...updatePageScanResult, notification: { scanNotifyUrl: scanNotifyUrl } });
                setupVerifiableSendNotificationMessageCall();

                await runner.run();
            });
        });

        describe('on run failed', () => {
            it('set notification state to failed if scanner throw', async () => {
                setupTelemetryWithTaskFailure();
                notificationMessage.runStatus = 'failed';
                notificationMessage.scanStatus = undefined;

                const failureMessage = 'failed to launch';
                setupPageScanWithException(failureMessage);

                setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), { notification: { scanNotifyUrl: scanNotifyUrl } });
                const updatePageScanResult = getFailingJobStateScanResult(System.serializeError(failureMessage), false);
                setupUpdateScanRunResultCall({ ...updatePageScanResult, notification: { scanNotifyUrl: scanNotifyUrl } });

                setupVerifiableSendNotificationMessageCall();
                await runner.run();
            });
        });

        function setupVerifiableSendNotificationMessageCall(): void {
            notificationQueueMessageSenderMock
                .setup((o) => o.sendNotificationMessage(It.isValue(notificationMessage)))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        }

        function setupSendNotificationMessageNeverCalled(): void {
            notificationQueueMessageSenderMock.setup((ndm) => ndm.sendNotificationMessage(It.isAny())).verifiable(Times.never());
        }
    });

    describe('generate combined scan result', () => {
        const baseUrl = 'baseUrl';
        const websiteScanId = 'websiteScanId';
        const reportId = 'reportId';
        const combinedResultsBlobId = 'combinedResultsBlobId';
        const websiteScanRefs = [{ id: websiteScanId, scanGroupType: 'consolidated-scan-report' }] as WebsiteScanRef[];

        let scanStarted: Date;
        let websiteScanResult: WebsiteScanResult;
        let combinedScanResults: CombinedScanResults;
        let generatedReport: GeneratedReport;
        let savedReport: OnDemandPageScanReport;
        let combinedScanResultsBlobRead: CombinedScanResultsReadResponse;

        beforeEach(() => {
            scanStarted = new Date(2020, 11, 12);
            guidGeneratorMock.reset();
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => combinedResultsBlobId);
            guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId);
            guidGeneratorMock.setup((g) => g.getGuidTimestamp('id')).returns(() => scanSubmittedDate);

            websiteScanResult = {
                id: websiteScanId,
                baseUrl,
                pageScans: [{ timestamp: scanStarted.toISOString() }],
                _etag: 'etag',
            } as WebsiteScanResult;
            combinedScanResults = {
                urlCount: {
                    total: 1,
                    passed: 1,
                },
                axeResults: {},
            } as CombinedScanResults;
            combinedScanResultsBlobRead = {
                results: { ...combinedScanResults, urlCount: { total: 0, passed: 0 } },
            } as CombinedScanResultsReadResponse;
            generatedReport = {
                content: 'consolidated report content',
                id: reportId,
                format: 'consolidated.html',
            } as GeneratedReport;
            savedReport = {
                reportId,
                href: 'href',
                format: 'consolidated.html',
            };

            reportGeneratorMock
                .setup((r) =>
                    r.generateConsolidatedReport(combinedScanResults, {
                        reportId,
                        baseUrl,
                        userAgent: passedAxeScanResults.userAgent,
                        browserResolution: passedAxeScanResults.browserResolution,
                        scanStarted,
                    }),
                )
                .returns(() => generatedReport);

            axeResultsReducerMock.setup((o) => o.reduce(combinedScanResults.axeResults, passedAxeScanResults.results)).verifiable();
            setupRetryHelperMock();
        });

        it('generate combined scan report without previous combined result', async () => {
            setupWebsiteScanResultsProviderMock(websiteScanResult);

            setupSuccessfulWebsiteScan();
            setupSaveReportCall(generatedReport, 'href');
            setupCombinedScanResultsProviderMock(combinedScanResultsBlobRead, false);
            setupCallsAfterCombinedResultsUpdate();

            await runner.run();
        });

        it('generate combined scan report with existing combined result', async () => {
            websiteScanResult.combinedResultsBlobId = combinedResultsBlobId;
            websiteScanResult.reports = [
                {
                    reportId,
                    href: 'href',
                    format: 'consolidated.html',
                },
            ];
            setupWebsiteScanResultsProviderMock(websiteScanResult);

            setupSuccessfulWebsiteScan();
            setupSaveReportCall(generatedReport, 'href');
            setupCombinedScanResultsProviderMock(combinedScanResultsBlobRead, true);
            setupCallsAfterCombinedResultsUpdate();

            await runner.run();
        });

        it('fail when combined scan result write has conflict', async () => {
            serviceConfigurationMock.reset();
            reportGeneratorMock.reset();

            setupWebsiteScanResultsProviderMock(websiteScanResult, true);
            setupSuccessfulWebsiteScan();
            telemetryManagerMock.setup((t) => t.trackScanTaskFailed());
            setupCombinedScanResultsProviderMock(combinedScanResultsBlobRead, false, true);
            setupCallsAfterCombinedResultsUpdate(true);

            await expect(runner.run()).rejects.toThrowError(/Failed to write new combined axe scan results blob./);
        });

        function setupCombinedScanResultsProviderMock(
            blobReadResponse: CombinedScanResultsReadResponse,
            blobExists: boolean,
            blobWriteConflict: boolean = false,
        ): void {
            blobReadResponse.etag = blobExists ? 'etag' : undefined;
            if (blobExists) {
                combinedScanResultsProviderMock
                    .setup(async (o) => o.readCombinedResults(combinedResultsBlobId))
                    .returns(async () => blobReadResponse)
                    .verifiable();
            } else {
                combinedScanResultsProviderMock
                    .setup((o) => o.getEmptyResponse())
                    .returns(() => blobReadResponse)
                    .verifiable();
            }

            combinedScanResultsProviderMock
                .setup(async (o) => o.writeCombinedResults(combinedResultsBlobId, combinedScanResults, blobExists ? 'etag' : undefined))
                .returns(async () => {
                    return blobWriteConflict ? { error: { errorCode: 'etagMismatch' } } : ({} as CombinedScanResultsWriteResponse);
                })
                .verifiable();
        }

        function setupWebsiteScanResultsProviderMock(websiteResult: WebsiteScanResult, blobWriteConflict: boolean = false): void {
            websiteScanResultsProviderMock
                .setup(async (o) => o.read(websiteScanId))
                .returns(async () => websiteResult)
                .verifiable();

            if (blobWriteConflict === false) {
                websiteScanResultsProviderMock
                    .setup((o) => o.mergeOrCreate({ id: websiteScanId, combinedResultsBlobId, reports: [savedReport], _etag: 'etag' }))
                    .verifiable();
            }
        }

        function setupSuccessfulWebsiteScan(): void {
            setupBasicTelemetry();
            setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), { websiteScanRefs });
            setupPageScan(passedAxeScanResults);
        }

        function setupCallsAfterCombinedResultsUpdate(blobWriteConflict: boolean = false): void {
            setupGenerateReportsCall(passedAxeScanResults);
            setupSaveAllReportsCall();

            if (blobWriteConflict === false) {
                const scanResult = getScanResultWithNoViolations();
                scanResult.websiteScanRefs = websiteScanRefs;
                scanResult.reports.push(savedReport);
                setupUpdateScanRunResultCall(scanResult);
            }
        }

        function setupRetryHelperMock(): void {
            retryHelperMock
                .setup((o) => o.executeWithRetries(It.isAny(), It.isAny(), 2, 1000))
                .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, retryCount: number) => {
                    try {
                        await action();
                    } catch (error) {
                        await errorHandler(error);
                        throw error;
                    }
                })
                .verifiable();
        }
    });

    describe('deepScan', () => {
        it('run deep scan if deepScan=true', async () => {
            scanMetadata.deepScan = true;
            setupScanAndSaveReports();
            deepScannerMock
                .setup((ds) => ds.runDeepScan(scanMetadata, It.isObjectWith(getScanResultWithNoViolations()), pageMock.object))
                .verifiable();

            await runner.run();

            deepScannerMock.verifyAll();
        });

        it.each([false, undefined])('Do not run deep scan if deepScan=%s', async (deepScan) => {
            scanMetadata.deepScan = deepScan;
            setupScanAndSaveReports();
            deepScannerMock.setup((ds) => ds.runDeepScan(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

            await runner.run();

            deepScannerMock.verifyAll();
        });

        function setupScanAndSaveReports(): void {
            setupBasicTelemetry();
            setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
            setupPageScan(passedAxeScanResults);
            setupGenerateReportsCall(passedAxeScanResults);
            setupSaveAllReportsCall();
            setupUpdateScanRunResultCall(getScanResultWithNoViolations());
        }
    });

    function setupPageScan(results: AxeScanResults): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(scanMetadata.url)).verifiable();

        scannerMock
            .setup(async (s) => s.scan(pageMock.object))
            .returns(async () => results)
            .verifiable();

        pageMock.setup((p) => p.close()).verifiable();
    }

    function setupPageScanWithException(error: any): void {
        pageMock.setup((p) => p.create()).verifiable();
        pageMock.setup((p) => p.navigateToUrl(scanMetadata.url)).verifiable();

        scannerMock
            .setup(async (s) => s.scan(It.isAny()))
            .returns(async () => Promise.reject(error))
            .verifiable();

        pageMock.setup((p) => p.close()).verifiable();
    }

    function setupGenerateReportsCall(scanResults: AxeScanResults): void {
        reportGeneratorMock.setup((r) => r.generateReports(scanResults)).returns(() => [generatedReport1, generatedReport2]);
    }

    function setupTryUpdateScanRunResultCall(
        result: Partial<OnDemandPageScanResult>,
        returnedProperties?: Partial<OnDemandPageScanResult>,
        succeeded: boolean = true,
    ): void {
        const clonedResult = cloneDeep(result) as OnDemandPageScanResult;
        const returnedResult = {
            ...clonedResult,
            ...returnedProperties,
        };
        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.tryUpdateScanRun(It.isValue(result)))
            .returns(async () => Promise.resolve({ succeeded, result: returnedResult }))
            .verifiable(Times.once());
    }

    function getRunningJobStateScanResult(): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            run: {
                state: 'running',
                timestamp: dateNow.toJSON(),
                error: null,
            },
            scanResult: null,
            reports: null,
        };
    }

    function setupSaveAllReportsCall(): void {
        setupSaveReportCall(generatedReport1, onDemandReport1.href);
        setupSaveReportCall(generatedReport2, onDemandReport2.href);
    }

    function setupSaveReportCall(report: GeneratedReport, href: string): void {
        pageScanRunReportProviderMock
            .setup(async (s) => s.saveReport(report.id, report.content))
            .returns(async () => Promise.resolve(href))
            .verifiable();
    }

    function getFailingJobStateScanResult(error: any, withPageInfo: boolean = true): Partial<OnDemandPageScanResult> {
        const result: Partial<OnDemandPageScanResult> = {
            id: onDemandPageScanResult.id,
            run: {
                state: 'failed',
                timestamp: dateNow.toJSON(),
                error,
            },
            scanResult: null,
            reports: null,
        };

        if (withPageInfo) {
            result.run.pageResponseCode = pageResponseCode;
            result.run.pageTitle = pageTitle;
        }

        return result;
    }

    function setupUpdateScanRunResultCall(result: Partial<OnDemandPageScanResult>): void {
        const clonedResult = cloneDeep(result);
        const fullClonedResult = cloneDeep(onDemandPageScanResult);
        fullClonedResult.run = cloneDeep(clonedResult.run);
        fullClonedResult.scanResult = cloneDeep(clonedResult.scanResult);
        fullClonedResult.reports = cloneDeep(clonedResult.reports);
        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.updateScanRun(It.isValue(clonedResult)))
            .returns(async () => Promise.resolve(fullClonedResult as OnDemandPageScanResult))
            .verifiable();
    }

    function getScanResultWithNoViolations(): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            run: {
                state: 'completed',
                timestamp: dateNow.toJSON(),
                error: undefined,
                pageResponseCode: pageResponseCode,
                pageTitle: pageTitle,
            },
            scanResult: {
                state: 'pass',
            },
            reports: [onDemandReport1, onDemandReport2],
        };
    }

    function getScanResultWithViolations(): Partial<OnDemandPageScanResult> {
        return {
            id: onDemandPageScanResult.id,
            run: {
                state: 'completed',
                timestamp: dateNow.toJSON(),
                error: undefined,
                pageResponseCode: pageResponseCode,
                pageTitle: pageTitle,
            },
            scanResult: {
                issueCount: 3,
                state: 'fail',
            },
            reports: [onDemandReport1, onDemandReport2],
        };
    }

    function setupGuidGenerator(): void {
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId2);
        guidGeneratorMock.setup((g) => g.getGuidTimestamp('id')).returns(() => scanSubmittedDate);
    }

    function setupBasicTelemetry(): void {
        telemetryManagerMock.setup((t) => t.trackScanStarted(scanSubmittedDate)).verifiable();
        telemetryManagerMock.setup((t) => t.trackScanCompleted());
    }

    function setupTelemetryWithBrowserError(): void {
        setupBasicTelemetry();
        telemetryManagerMock.setup((t) => t.trackBrowserScanFailed());
    }

    function setupTelemetryWithTaskFailure(): void {
        setupBasicTelemetry();
        telemetryManagerMock.setup((t) => t.trackScanTaskFailed());
    }
});
