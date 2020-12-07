// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { FeatureFlags, GuidGenerator, ServiceConfiguration, System } from 'common';
import { cloneDeep } from 'lodash';
import { Logger, ScanTaskCompletedMeasurements, ScanTaskStartedMeasurements } from 'logger';
import * as MockDate from 'mockdate';
import { AxeScanResults } from 'scanner-global-library';
import {
    CombinedScanResultsProvider,
    OnDemandPageScanRunResultProvider,
    PageScanRunReportProvider,
    WebsiteScanResultProvider,
    CombinedScanResultsCreateResponse,
    CombinedScanResultsReadResponse,
} from 'service-library';
import {
    CombinedScanResults,
    ItemType,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanState,
    WebsiteScanResult,
} from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { Scanner } from '../scanner/scanner';
import { NotificationQueueMessageSender } from '../sender/notification-queue-message-sender';
import { ScanMetadata } from '../types/scan-metadata';
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
    const scanMetadata: ScanMetadata = {
        id: 'id',
        url: 'url',
    };

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

    let dateNow: Date;

    const queueTime: number = 20;
    const executionTime: number = 30;
    const scanStartedMeasurements: ScanTaskStartedMeasurements = { scanWaitTime: queueTime, startedScanTasks: 1 };
    const scanCompletedMeasurements: ScanTaskCompletedMeasurements = {
        scanExecutionTime: executionTime,
        scanTotalTime: executionTime + queueTime,
        completedScanTasks: 1,
    };

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
        scannerMock = Mock.ofType<Scanner>();
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
        );
    });

    afterEach(() => {
        MockDate.reset();
        scannerMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        serviceConfigurationMock.verifyAll();
        notificationQueueMessageSenderMock.verifyAll();
        websiteScanResultsProviderMock.verifyAll();
        combinedScanResultsProviderMock.verifyAll();
    });

    it('sets job state to failed if axe scanning was unsuccessful', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(unscannableAxeScanResults))
            .verifiable();

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(unscannableAxeScanResults.error));

        await runner.run();
    });

    it('sets job state to failed if scanner throws', async () => {
        const failureMessage = 'scanner task failed message';

        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => Promise.reject(failureMessage))
            .verifiable();

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(System.serializeError(failureMessage), false));

        loggerMock.setup((lm) => lm.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 })).verifiable();

        const timestamps = setupTimeMocks(queueTime, executionTime);
        // need mock Date.Now() after code throws
        loggerMock
            .setup((o) => o.logError(`The scanner failed to scan a page.`, It.isAny()))
            .returns(() => MockDate.set(timestamps.scanCompleteTime));
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskStarted', undefined, scanStartedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskCompleted', undefined, scanCompletedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskFailed', undefined, { failedScanTasks: 1 })).verifiable();

        await runner.run();

        loggerMock.verifyAll();
    });

    it('skip task run when database state lock conflict', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), {}, false);
        serviceConfigurationMock.reset();
        loggerMock
            .setup((o) =>
                o.logInfo(
                    `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
                ),
            )
            .verifiable();

        await runner.run();
        loggerMock.verifyAll();
    });

    it('sets scan status to pass if violation length = 0', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(passedAxeScanResults))
            .verifiable();

        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('return redirected url', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());

        const clonedPassedAxeScanResults = cloneDeep(passedAxeScanResults);
        clonedPassedAxeScanResults.scannedUrl = 'redirect url';
        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(clonedPassedAxeScanResults))
            .verifiable();

        setupGenerateReportsCall(clonedPassedAxeScanResults);
        setupSaveAllReportsCall();
        const scanResultWithNoViolations = getScanResultWithNoViolations();
        scanResultWithNoViolations.scannedUrl = clonedPassedAxeScanResults.scannedUrl;
        setupUpdateScanRunResultCall(scanResultWithNoViolations);

        await runner.run();
    });

    it('sets scan status to fail if violation length > 0', async () => {
        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(axeScanResultsWithViolations))
            .verifiable();

        setupGenerateReportsCall(axeScanResultsWithViolations);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithViolations());

        await runner.run();
    });

    it('sends telemetry event on successful scan', async () => {
        const timestamps = setupTimeMocks(queueTime, executionTime);

        loggerMock.setup((lm) => lm.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 })).verifiable(Times.never());

        loggerMock.setup((lm) => lm.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 })).verifiable(Times.never());

        loggerMock.setup((lm) => lm.trackEvent('ScanTaskStarted', undefined, scanStartedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskCompleted', undefined, scanCompletedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskFailed', undefined, { failedScanTasks: 1 })).verifiable(Times.never());

        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => {
                MockDate.set(timestamps.scanCompleteTime);

                return passedAxeScanResults;
            })
            .verifiable();
        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        const scanResult = getScanResultWithNoViolations();
        scanResult.run.timestamp = timestamps.scanCompleteTime.toJSON();
        setupUpdateScanRunResultCall(scanResult);

        await runner.run();
        loggerMock.verifyAll();
    });

    it('sends telemetry event on scan error', async () => {
        const timestamps = setupTimeMocks(queueTime, executionTime);

        loggerMock.setup((lm) => lm.trackEvent('ScanRequestRunning', undefined, { runningScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestCompleted', undefined, { completedScanRequests: 1 })).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanRequestFailed', undefined, { failedScanRequests: 1 })).verifiable(Times.never());

        loggerMock.setup((lm) => lm.trackEvent('ScanTaskStarted', undefined, scanStartedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskCompleted', undefined, scanCompletedMeasurements)).verifiable();
        loggerMock.setup((lm) => lm.trackEvent('ScanTaskFailed', undefined, { failedScanTasks: 1 })).verifiable(Times.never());

        loggerMock.setup((lm) => lm.trackEvent('BrowserScanFailed', undefined, { failedBrowserScans: 1 })).verifiable();

        setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
        scannerMock
            .setup(async (s) => s.scan(scanMetadata.url))
            .returns(async () => {
                MockDate.set(timestamps.scanCompleteTime);

                return unscannableAxeScanResults;
            })
            .verifiable();
        setupGenerateReportsCall(unscannableAxeScanResults);
        setupSaveAllReportsCall();
        const scanResult = getFailingJobStateScanResult(unscannableAxeScanResults.error);
        scanResult.run.timestamp = timestamps.scanCompleteTime.toJSON();
        setupUpdateScanRunResultCall(scanResult);

        await runner.run();
        loggerMock.verifyAll();
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
                setupGenerateReportsCall(passedAxeScanResults);
                setupSaveAllReportsCall();
            });

            test.each([undefined, { scanNotifyUrl: undefined }])(
                'Do not send notification when url not present, notification = %o',
                async (notification) => {
                    notificationMessage.scanStatus = 'pass';
                    scannerMock
                        .setup(async (s) => s.scan(scanMetadata.url))
                        .returns(async () => Promise.resolve(passedAxeScanResults))
                        .verifiable();

                    const fullResult = cloneDeep(onDemandPageScanResult);
                    fullResult.notification = notification;
                    setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
                    setupUpdateScanRunResultCall(getScanResultWithNoViolations(), fullResult);
                    setupSendNotificationMessageNeverCalled();

                    await runner.run();
                },
            );

            test.each([
                ['fail', axeScanResultsWithViolations],
                ['pass', passedAxeScanResults],
            ])('Notification url is not null - scan status - %s', async (scanStatus: ScanState, scanResults) => {
                notificationMessage.scanStatus = scanStatus;
                scannerMock
                    .setup(async (s) => s.scan(scanMetadata.url))
                    .returns(async () => Promise.resolve(scanResults))
                    .verifiable();

                setupGenerateReportsCall(scanResults);
                setupSaveAllReportsCall();

                const fullResult = cloneDeep(onDemandPageScanResult);
                fullResult.notification = { scanNotifyUrl: scanNotifyUrl };
                setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
                setupUpdateScanRunResultCall(
                    scanStatus === 'pass' ? getScanResultWithNoViolations() : getScanResultWithViolations(),
                    fullResult,
                );
                setupVerifiableSendNotificationMessageCall();

                await runner.run();
            });
        });

        describe('on run failed', () => {
            it('set notification state to failed if scanner throw', async () => {
                notificationMessage.runStatus = 'failed';
                notificationMessage.scanStatus = undefined;

                const failureMessage = 'failed to launch';
                scannerMock
                    .setup(async (o) => o.scan(It.isAny()))
                    .returns(async () => Promise.reject(failureMessage))
                    .verifiable(Times.once());

                const fullResult = cloneDeep(onDemandPageScanResult);
                fullResult.notification = { scanNotifyUrl: scanNotifyUrl };
                setupTryUpdateScanRunResultCall(getRunningJobStateScanResult());
                setupUpdateScanRunResultCall(getFailingJobStateScanResult(System.serializeError(failureMessage), false), fullResult);

                setupVerifiableSendNotificationMessageCall();
                await runner.run();
            });
        });

        function setupVerifiableSendNotificationMessageCall(): void {
            notificationQueueMessageSenderMock
                .setup((ndm) => ndm.sendNotificationMessage(notificationMessage))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        }

        function setupSendNotificationMessageNeverCalled(): void {
            notificationQueueMessageSenderMock.setup((ndm) => ndm.sendNotificationMessage(It.isAny())).verifiable(Times.never());
        }
    });

    describe('Combined website scan', () => {
        const websiteScanId = 'website scan id';
        let websiteScanResult: WebsiteScanResult;
        const combinedResultsBlobId = 'combined results blob id';
        const combinedResults = {} as CombinedScanResults;

        beforeEach(() => {
            websiteScanResult = {
                id: websiteScanId,
                _etag: 'etag',
            } as WebsiteScanResult;
        });

        it('handles website scan results read failure', async () => {
            setupSuccessfulWebsiteScan();
            websiteScanResultsProviderMock
                .setup((wp) => wp.read(It.isAny()))
                .throws(new Error())
                .verifiable();
            setupCallsAfterCombinedResultsUpdate();

            await runner.run();
        });

        describe('results blob does not exist', () => {
            beforeEach(() => {
                setupSuccessfulWebsiteScan();
                websiteScanResultsProviderMock.setup((wp) => wp.read(websiteScanId)).returns(() => Promise.resolve(websiteScanResult));
            });

            it('successfully create new results blob', async () => {
                setupCreateNewCombinedResults({});

                const mergeProperties = {
                    ...websiteScanResult,
                    combinedResultsBlobId,
                };
                websiteScanResultsProviderMock.setup((wp) => wp.mergeOrCreate(mergeProperties)).verifiable();

                setupCallsAfterCombinedResultsUpdate();

                await runner.run();
            });

            it('handles website results update failure', async () => {
                setupCreateNewCombinedResults({});

                websiteScanResultsProviderMock
                    .setup((wp) => wp.mergeOrCreate(It.isAny()))
                    .throws(new Error())
                    .verifiable();

                setupCallsAfterCombinedResultsUpdate();

                await runner.run();
            });

            it('handles blob creation failure', async () => {
                setupCreateNewCombinedResults({ error: {} } as CombinedScanResultsCreateResponse);

                websiteScanResultsProviderMock.setup((wp) => wp.mergeOrCreate(It.isAny())).verifiable(Times.never());

                setupCallsAfterCombinedResultsUpdate();

                await runner.run();
            });

            function setupCreateNewCombinedResults(response: CombinedScanResultsCreateResponse): void {
                guidGeneratorMock.reset();
                guidGeneratorMock.setup((gg) => gg.createGuid()).returns(() => combinedResultsBlobId);
                setupGuidGenerator();

                combinedScanResultsProviderMock
                    .setup((crp) => crp.createCombinedResults(combinedResultsBlobId))
                    .returns(() => Promise.resolve(response))
                    .verifiable();
            }
        });

        describe('Results blob already exists', () => {
            beforeEach(() => {
                setupSuccessfulWebsiteScan();
                websiteScanResult.combinedResultsBlobId = combinedResultsBlobId;
                websiteScanResultsProviderMock.setup((wp) => wp.read(websiteScanId)).returns(() => Promise.resolve(websiteScanResult));
            });

            it('Successfully reads existing blob', async () => {
                combinedScanResultsProviderMock
                    .setup((crp) => crp.readCombinedResults(combinedResultsBlobId))
                    .returns(() => Promise.resolve({ results: combinedResults }))
                    .verifiable();

                setupCallsAfterCombinedResultsUpdate();

                await runner.run();
            });

            it('Handles blob read error', async () => {
                combinedScanResultsProviderMock
                    .setup((crp) => crp.readCombinedResults(combinedResultsBlobId))
                    .returns(() => Promise.resolve({ error: {} } as CombinedScanResultsReadResponse))
                    .verifiable();

                setupCallsAfterCombinedResultsUpdate();

                await runner.run();
            });
        });

        function setupSuccessfulWebsiteScan(): void {
            const scanRunProperties = { websiteScanIds: [websiteScanId] };
            setupTryUpdateScanRunResultCall(getRunningJobStateScanResult(), scanRunProperties);
            scannerMock
                .setup(async (s) => s.scan(scanMetadata.url))
                .returns(async () => passedAxeScanResults)
                .verifiable();
        }

        function setupCallsAfterCombinedResultsUpdate(): void {
            setupGenerateReportsCall(passedAxeScanResults);
            setupSaveAllReportsCall();
            setupUpdateScanRunResultCall(getScanResultWithNoViolations());
        }
    });

    function setupGenerateReportsCall(scanResults: AxeScanResults): void {
        reportGeneratorMock.setup((r) => r.generateReports(scanResults)).returns(() => [generatedReport1, generatedReport2]);
    }

    function setupTryUpdateScanRunResultCall(
        result: Partial<OnDemandPageScanResult>,
        scanRunProperties?: Partial<OnDemandPageScanResult>,
        succeeded: boolean = true,
    ): void {
        const clonedResult = cloneDeep(result) as OnDemandPageScanResult;
        const returnedResult = {
            ...clonedResult,
            ...scanRunProperties,
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

    function setupUpdateScanRunResultCall(
        result: Partial<OnDemandPageScanResult>,
        fullResult: OnDemandPageScanResult = onDemandPageScanResult,
    ): void {
        const clonedResult = cloneDeep(result);
        const fullClonedResult = cloneDeep(fullResult);
        fullClonedResult.run = cloneDeep(clonedResult.run);
        fullClonedResult.scanResult = cloneDeep(clonedResult.scanResult);
        fullClonedResult.reports = cloneDeep(clonedResult.reports);

        onDemandPageScanRunResultProviderMock
            .setup(async (d) => d.updateScanRun(It.isValue(clonedResult)))
            .returns(async () => Promise.resolve(fullClonedResult))
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

    interface ScanRunTimestamps {
        scanRequestTime: Date;
        scanCompleteTime: Date;
    }

    function setupGuidGenerator(): void {
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup((g) => g.getGuidTimestamp('id')).returns(() => new Date());
    }

    function setupTimeMocks(queueTimestamp: number, executionTimestamp: number): ScanRunTimestamps {
        const scanRequestTime: Date = new Date();
        const scanCompleteTime: Date = new Date();
        scanRequestTime.setSeconds(scanRequestTime.getSeconds() - queueTimestamp);

        guidGeneratorMock.reset();
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId2);
        guidGeneratorMock
            .setup((g) => g.getGuidTimestamp('id'))
            .returns(() => scanRequestTime)
            .verifiable();
        scanCompleteTime.setSeconds(scanCompleteTime.getSeconds() + executionTimestamp);

        guidGeneratorMock.reset();
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => reportId2);
        guidGeneratorMock
            .setup((g) => g.getGuidTimestamp('id'))
            .returns(() => scanRequestTime)
            .verifiable();

        return { scanRequestTime: scanRequestTime, scanCompleteTime: scanCompleteTime };
    }
});
