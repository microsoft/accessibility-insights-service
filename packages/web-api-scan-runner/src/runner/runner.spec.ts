// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { GuidGenerator } from 'common';
import { cloneDeep } from 'lodash';
import { Logger, ScanTaskCompletedMeasurements, ScanTaskStartedMeasurements } from 'logger';
import * as MockDate from 'mockdate';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider, PageScanRunReportService } from 'service-library';
import { ItemType, OnDemandPageScanReport, OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(Runner, () => {
    let runner: Runner;
    let browser: Browser;
    let webDriverTaskMock: IMock<WebDriverTask>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let scannerTaskMock: IMock<ScannerTask>;
    let scanMetadataConfig: IMock<ScanMetadataConfig>;
    let loggerMock: IMock<MockableLogger>;
    let pageScanRunReportServiceMock: IMock<PageScanRunReportService>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    const scanMetadata: ScanMetadata = {
        id: 'id',
        url: 'url',
        priority: 1,
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

    beforeEach(() => {
        browser = <Browser>{};
        webDriverTaskMock = Mock.ofType(WebDriverTask, MockBehavior.Strict);
        loggerMock = Mock.ofType(MockableLogger);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
        scannerTaskMock = Mock.ofType<ScannerTask>();
        scanMetadataConfig.setup(s => s.getConfig()).returns(() => scanMetadata);
        pageScanRunReportServiceMock = Mock.ofType(PageScanRunReportService, MockBehavior.Strict);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup(g => g.getGuidTimestamp('id')).returns(() => new Date());
        dateNow = new Date(2019, 2, 3);
        MockDate.set(dateNow);

        reportGeneratorMock = Mock.ofType<ReportGenerator>();

        runner = new Runner(
            guidGeneratorMock.object,
            scanMetadataConfig.object,
            scannerTaskMock.object,
            onDemandPageScanRunResultProviderMock.object,
            webDriverTaskMock.object,
            loggerMock.object,
            pageScanRunReportServiceMock.object,
            reportGeneratorMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        scannerTaskMock.verifyAll();
        webDriverTaskMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
    });

    it('sets state to failed if web driver launch crashes', async () => {
        const failureMessage = 'failed to launch';
        webDriverTaskMock
            .setup(async o => o.launch())
            .returns(async () => Promise.reject(failureMessage))
            .verifiable(Times.once());

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());
        setupUpdateScanRunResultCall(getFailingJobStateScanResult(JSON.stringify(failureMessage), false));

        await runner.run();
    });

    it('do not crash if web driver close crashes', async () => {
        webDriverTaskMock
            .setup(async o => o.launch())
            .returns(async () => Promise.resolve(browser))
            .verifiable(Times.once());

        webDriverTaskMock
            .setup(async o => o.close())
            .returns(async () => Promise.reject('failed to close'))
            .verifiable(Times.once());

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(passedAxeScanResults))
            .verifiable();

        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('sets job state to failed if axe scanning was unsuccessful', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(unscannableAxeScanResults))
            .verifiable();

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(unscannableAxeScanResults.error));

        await runner.run();
    });

    it('sets job state to failed if scanner task throws', async () => {
        const failureMessage = 'scanner task failed message';
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.reject(failureMessage))
            .verifiable();

        setupUpdateScanRunResultCall(getFailingJobStateScanResult(JSON.stringify(failureMessage), false));

        await runner.run();
    });

    it('sets scan status to pass if violation length = 0', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(passedAxeScanResults))
            .verifiable();

        setupGenerateReportsCall(passedAxeScanResults);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('sets scan status to fail if violation length > 0', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(axeScanResultsWithViolations))
            .verifiable();

        setupGenerateReportsCall(axeScanResultsWithViolations);
        setupSaveAllReportsCall();
        setupUpdateScanRunResultCall(getScanResultWithViolations());

        await runner.run();
    });

    it('sends telemetry event on successful scan', async () => {
        const queueTime: number = 20;
        const executionTime: number = 30;
        const timestamps = setupTimeMocks(queueTime, executionTime, passedAxeScanResults);

        const scanStartedMeasurements: ScanTaskStartedMeasurements = { scanWaitTime: queueTime };
        const scanCompletedMeasurements: ScanTaskCompletedMeasurements = {
            scanExecutionTime: executionTime,
            scanTotalTime: executionTime + queueTime,
        };

        loggerMock.setup(lm => lm.trackEvent('ScanTaskStarted', undefined, scanStartedMeasurements)).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskCompleted', undefined, scanCompletedMeasurements)).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskSucceeded')).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskFailed')).verifiable(Times.never());

        setupWebDriverCalls();
        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());
        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
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
        const queueTime: number = 20;
        const executionTime: number = 30;
        const timestamps = setupTimeMocks(queueTime, executionTime, passedAxeScanResults);

        const scanStartedMeasurements: ScanTaskStartedMeasurements = { scanWaitTime: queueTime };
        const scanCompletedMeasurements: ScanTaskCompletedMeasurements = {
            scanExecutionTime: executionTime,
            scanTotalTime: executionTime + queueTime,
        };

        loggerMock.setup(lm => lm.trackEvent('ScanTaskStarted', undefined, scanStartedMeasurements)).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskCompleted', undefined, scanCompletedMeasurements)).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskFailed')).verifiable();
        loggerMock.setup(lm => lm.trackEvent('ScanTaskSucceeded')).verifiable(Times.never());

        setupWebDriverCalls();
        setupReadScanResultCall(onDemandPageScanResult);
        setupUpdateScanRunResultCall(getRunningJobStateScanResult());
        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
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

    function setupGenerateReportsCall(scanResults: AxeScanResults): void {
        reportGeneratorMock.setup(r => r.generateReports(scanResults)).returns(() => [generatedReport1, generatedReport2]);
    }

    function setupReadScanResultCall(scanResult: any): void {
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.readScanRun(scanMetadata.id))
            .returns(async () => Promise.resolve(cloneDeep(scanResult)))
            .verifiable(Times.exactly(1));
    }

    function getRunningJobStateScanResult(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'running',
            timestamp: dateNow.toJSON(),
            error: null,
        };

        return result;
    }

    function setupSaveAllReportsCall(): void {
        setupSaveReportCall(generatedReport1, onDemandReport1.href);
        setupSaveReportCall(generatedReport2, onDemandReport2.href);
    }

    function setupSaveReportCall(report: GeneratedReport, href: string): void {
        pageScanRunReportServiceMock
            .setup(async s => s.saveReport(report.id, report.content))
            .returns(async () => Promise.resolve(href))
            .verifiable();
    }

    function getFailingJobStateScanResult(error: any, withPageInfo: boolean = true): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error,
        };

        if (withPageInfo) {
            result.run.pageResponseCode = pageResponseCode;
            result.run.pageTitle = pageTitle;
        }

        return result;
    }

    function setupUpdateScanRunResultCall(result: OnDemandPageScanResult): void {
        const clonedResult = cloneDeep(result);

        onDemandPageScanRunResultProviderMock
            .setup(async d => d.updateScanRun(clonedResult))
            .returns(async () => Promise.resolve(clonedResult))
            .verifiable();
    }

    function getScanResultWithNoViolations(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
        };
        result.scanResult = {
            state: 'pass',
        };

        result.reports = [onDemandReport1, onDemandReport2];

        return result;
    }

    function getScanResultWithViolations(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
        };
        result.scanResult = {
            issueCount: 3,
            state: 'fail',
        };

        result.reports = [onDemandReport1, onDemandReport2];

        return result;
    }

    function setupWebDriverCalls(): void {
        webDriverTaskMock
            .setup(async o => o.launch())
            .returns(async () => Promise.resolve(browser))
            .verifiable(Times.once());

        webDriverTaskMock
            .setup(async o => o.close())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
    }

    interface ScanRunTimestamps {
        scanRequestTime: Date;
        scanCompleteTime: Date;
    }

    function setupTimeMocks(queueTime: number, executionTime: number, scanResults: AxeScanResults): ScanRunTimestamps {
        const scanRequestTime: Date = new Date();
        const scanCompleteTime: Date = new Date();
        scanRequestTime.setSeconds(scanRequestTime.getSeconds() - queueTime);

        guidGeneratorMock.reset();
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId2);
        guidGeneratorMock
            .setup(g => g.getGuidTimestamp('id'))
            .returns(() => scanRequestTime)
            .verifiable();
        scanCompleteTime.setSeconds(scanCompleteTime.getSeconds() + executionTime);

        guidGeneratorMock.reset();
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId1);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportId2);
        guidGeneratorMock
            .setup(g => g.getGuidTimestamp('id'))
            .returns(() => scanRequestTime)
            .verifiable();

        return { scanRequestTime: scanRequestTime, scanCompleteTime: scanCompleteTime };
    }
});
