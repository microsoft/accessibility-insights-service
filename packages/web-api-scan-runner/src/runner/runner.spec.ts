// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { convertAxeToSarif } from 'axe-sarif-converter';
import { GuidGenerator } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import * as MockDate from 'mockdate';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { OnDemandPageScanRunResultProvider, PageScanRunReportService } from 'service-library';
import { ItemType, OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { WebDriverTask } from '../tasks/web-driver-task';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

// tslint:disable: no-any

describe(Runner, () => {
    let runner: Runner;
    let browser: Browser;
    let webDriverTaskMock: IMock<WebDriverTask>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let scannerTaskMock: IMock<ScannerTask>;
    let scanMetadataConfig: IMock<ScanMetadataConfig>;
    let loggerMock: IMock<Logger>;
    let pageScanRunReportServiceMock: IMock<PageScanRunReportService>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let convertAxeToSarifMock: IMock<typeof convertAxeToSarif>;
    const scanMetadata: ScanMetadata = {
        id: 'id',
        url: 'url',
        priority: 1,
    };

    // tslint:disable-next-line:mocha-no-side-effect-code
    const onDemandPageScanResult: OnDemandPageScanResult = {
        url: 'url',
        scanResult: undefined,
        reports: [
            {
                reportId: '',
                href: '',
                format: 'sarif',
            },
        ],
        run: {
            state: 'queued' as OnDemandPageScanRunState,
            timestamp: 'timestamp',
            error: '',
        },
        priority: 1,
        itemType: ItemType.onDemandPageScanRunResult,
        id: 'id',
        partitionKey: 'item-partitionKey',
    };

    // tslint:disable-next-line: mocha-no-side-effect-code
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
    };

    const unscannableAxeScanResults: AxeScanResults = {
        unscannable: true,
        error: 'test scan error - not a valid page',
    };
    const blobFilePath = 'test sarif blob path';
    // tslint:disable-next-line:mocha-no-side-effect-code
    const parsedSarifContent = { testSarifContent: true } as any;
    // tslint:disable-next-line: mocha-no-side-effect-code
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
    };

    let dateNow: Date;
    const reportGuid = 'report guid1';

    beforeEach(() => {
        browser = <Browser>{};
        webDriverTaskMock = Mock.ofType(WebDriverTask, MockBehavior.Strict);
        loggerMock = Mock.ofType(Logger);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        scanMetadataConfig = Mock.ofType(ScanMetadataConfig);
        scannerTaskMock = Mock.ofType<ScannerTask>();
        scanMetadataConfig.setup(s => s.getConfig()).returns(() => scanMetadata);
        pageScanRunReportServiceMock = Mock.ofType(PageScanRunReportService, MockBehavior.Strict);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => reportGuid);
        dateNow = new Date(2019, 2, 3);
        MockDate.set(dateNow);
        convertAxeToSarifMock = Mock.ofInstance(convertAxeToSarif, MockBehavior.Strict);
        runner = new Runner(
            guidGeneratorMock.object,
            scanMetadataConfig.object,
            scannerTaskMock.object,
            onDemandPageScanRunResultProviderMock.object,
            webDriverTaskMock.object,
            loggerMock.object,
            pageScanRunReportServiceMock.object,
            convertAxeToSarifMock.object,
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
            .returns(async () => Promise.reject('failed to launch'))
            .verifiable(Times.once());

        setupReadScanResultCall(onDemandPageScanResult);
        setupSaveScanResultCall(getRunningJobStateScanResult());
        setupSaveScanResultCall(getFailingJobStateScanResult(failureMessage));

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
        setupSaveScanResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(passedAxeScanResults))
            .verifiable();

        setupConvertAxeToSarifCall(passedAxeScanResults);

        setupSaveSarifReportCall();
        setupSaveScanResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('sets job state to failed if axe scanning was unsuccessful', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupSaveScanResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(unscannableAxeScanResults))
            .verifiable();

        setupSaveScanResultCall(getFailingJobStateScanResult(unscannableAxeScanResults.error));

        await runner.run();
    });
    it('sets job state to failed if scanner task throws', async () => {
        const failureMessage = 'scanner task failed message';
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupSaveScanResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.reject(failureMessage))
            .verifiable();

        setupSaveScanResultCall(getFailingJobStateScanResult(failureMessage));

        await runner.run();
    });

    it('sets scan status to pass if violation length = 0', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupSaveScanResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(passedAxeScanResults))
            .verifiable();

        setupConvertAxeToSarifCall(passedAxeScanResults);

        setupSaveSarifReportCall();
        setupSaveScanResultCall(getScanResultWithNoViolations());

        await runner.run();
    });

    it('sets scan status to fail if violation length > 0', async () => {
        setupWebDriverCalls();

        setupReadScanResultCall(onDemandPageScanResult);
        setupSaveScanResultCall(getRunningJobStateScanResult());

        scannerTaskMock
            .setup(async s => s.scan(scanMetadata.url))
            .returns(async () => Promise.resolve(axeScanResultsWithViolations))
            .verifiable();

        setupConvertAxeToSarifCall(axeScanResultsWithViolations);

        setupSaveSarifReportCall();
        setupSaveScanResultCall(getScanResultWithViolations());

        await runner.run();
    });

    function setupConvertAxeToSarifCall(scanResults: AxeScanResults): void {
        convertAxeToSarifMock
            .setup(c => c(scanResults.results))
            .returns(() => parsedSarifContent)
            .verifiable();
    }
    it('handles if cosmos read fails', async () => {
        const failureMessage = 'test error - read failed';

        onDemandPageScanRunResultProviderMock
            .setup(async s => s.readScanRuns(It.isAny()))
            .returns(async () => Promise.reject(failureMessage));

        await expect(runner.run()).rejects.toBe(failureMessage);
    });

    it('handles if cosmos write fails', async () => {
        const failureMessage = 'test error - write failed';

        setupReadScanResultCall(onDemandPageScanResult, 1);
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.updateScanRun(It.isAny()))
            .returns(async () => Promise.reject(failureMessage));

        await expect(runner.run()).rejects.toBe(failureMessage);
    });

    function setupReadScanResultCall(scanResult: any, times: number = 2): void {
        onDemandPageScanRunResultProviderMock
            .setup(async d => d.readScanRuns([scanMetadata.id]))
            .returns(async () => Promise.resolve([cloneDeep(scanResult)]))
            .verifiable(Times.exactly(times));
    }

    function getRunningJobStateScanResult(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'running',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };

        return result;
    }

    function setupSaveSarifReportCall(): void {
        pageScanRunReportServiceMock
            .setup(async s => s.saveSarifReport(reportGuid, JSON.stringify(parsedSarifContent)))
            .returns(async () => Promise.resolve(blobFilePath))
            .verifiable();
    }

    function getFailingJobStateScanResult(error: any): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'failed',
            timestamp: dateNow.toJSON(),
            error: error,
        };
        result.scanResult = {
            issueCount: 0,
            state: 'pending',
        };

        return result;
    }

    function setupSaveScanResultCall(result: OnDemandPageScanResult): void {
        const clonedResult = cloneDeep(result);

        onDemandPageScanRunResultProviderMock
            .setup(async d => d.updateScanRun(clonedResult))
            .returns(async () => Promise.resolve())
            .verifiable();
    }

    function getScanResultWithNoViolations(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };
        result.scanResult = {
            issueCount: 0,
            state: 'pass',
        };

        result.reports = [
            {
                format: 'sarif',
                href: blobFilePath,
                reportId: reportGuid,
            },
        ];

        return result;
    }

    function getScanResultWithViolations(): OnDemandPageScanResult {
        const result = cloneDeep(onDemandPageScanResult);
        result.run = {
            state: 'completed',
            timestamp: dateNow.toJSON(),
            error: undefined,
        };
        result.scanResult = {
            issueCount: 3,
            state: 'fail',
        };

        result.reports = [
            {
                format: 'sarif',
                href: blobFilePath,
                reportId: reportGuid,
            },
        ];

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
});
