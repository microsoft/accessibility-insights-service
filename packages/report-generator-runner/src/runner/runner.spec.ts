// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import {
    ReportGeneratorRequestProvider,
    OnDemandPageScanRunResultProvider,
    OperationResult,
    WebsiteScanResultProvider,
    ScanNotificationProcessor,
    RunnerScanMetadata,
} from 'service-library';
import { GlobalLogger } from 'logger';
import { ReportGeneratorRequest, OnDemandPageScanResult, ReportScanRunState, WebsiteScanResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import { isEmpty, cloneDeep } from 'lodash';
import { RunMetadataConfig } from '../run-metadata-config';
import { ReportGeneratorRunnerTelemetryManager } from '../report-generator-runner-telemetry-manager';
import { ReportGeneratorMetadata } from '../types/report-generator-metadata';
import { ReportProcessor } from '../report-processor/report-processor';
import { RequestSelector, QueuedRequests, QueuedRequest, DispatchCondition } from './request-selector';
import { Runner } from './runner';

/* eslint-disable @typescript-eslint/no-explicit-any */

const maxQueuedRequests = 10;

interface ReportGeneratorRequestMockType extends ReportGeneratorRequest {
    condition?: DispatchCondition;
}

let runMetadataConfigMock: IMock<RunMetadataConfig>;
let reportGeneratorRequestProviderMock: IMock<ReportGeneratorRequestProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let requestSelectorMock: IMock<RequestSelector>;
let reportProcessorMock: IMock<ReportProcessor>;
let reportGeneratorRunnerTelemetryManagerMock: IMock<ReportGeneratorRunnerTelemetryManager>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let scanNotificationProcessorMock: IMock<ScanNotificationProcessor>;
let loggerMock: IMock<GlobalLogger>;
let runner: Runner;
let reportGeneratorMetadataInput: ReportGeneratorMetadata;
let reportGeneratorMetadata: ReportGeneratorMetadata;
let dateNow: Date;
let reportGeneratorRequests: ReportGeneratorRequest[];

describe(Runner, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        reportGeneratorRequests = [
            {
                id: 'id-1',
                scanId: 'scanId-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                condition: 'pending',
            },
            {
                id: 'id-2',
                scanId: 'scanId-2',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                condition: 'pending',
            },
            {
                id: 'id-3',
                scanId: 'scanId-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'completed',
                },
                condition: 'completed',
            },
        ] as ReportGeneratorRequestMockType[];

        runMetadataConfigMock = Mock.ofType<RunMetadataConfig>();
        reportGeneratorRequestProviderMock = Mock.ofType<ReportGeneratorRequestProvider>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        requestSelectorMock = Mock.ofType<RequestSelector>();
        reportProcessorMock = Mock.ofType<ReportProcessor>();
        reportGeneratorRunnerTelemetryManagerMock = Mock.ofType<ReportGeneratorRunnerTelemetryManager>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        scanNotificationProcessorMock = Mock.ofType<ScanNotificationProcessor>();
        loggerMock = Mock.ofType<GlobalLogger>();

        reportGeneratorMetadataInput = {
            targetReport: 'accessibility',
            scanGroupId: 'scanGroupId%2F1',
        } as ReportGeneratorMetadata;
        reportGeneratorMetadata = {
            targetReport: 'accessibility',
            scanGroupId: 'scanGroupId/1',
        } as ReportGeneratorMetadata;

        runMetadataConfigMock
            .setup((o) => o.getConfig())
            .returns(() => reportGeneratorMetadataInput)
            .verifiable();
        reportGeneratorRunnerTelemetryManagerMock.setup((o) => o.trackRequestStarted(reportGeneratorMetadata.id)).verifiable();
        reportGeneratorRunnerTelemetryManagerMock.setup((o) => o.trackRequestCompleted()).verifiable();
        loggerMock.setup((o) => o.setCommonProperties({ scanGroupId: reportGeneratorMetadata.scanGroupId })).verifiable();
        loggerMock.setup((o) => o.logInfo('Start report generator runner.')).verifiable();
        loggerMock.setup((o) => o.logInfo('Stop report generator runner.')).verifiable();

        runner = new Runner(
            runMetadataConfigMock.object,
            reportGeneratorRequestProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            websiteScanResultProviderMock.object,
            requestSelectorMock.object,
            reportProcessorMock.object,
            reportGeneratorRunnerTelemetryManagerMock.object,
            scanNotificationProcessorMock.object,
            loggerMock.object,
        );
        (runner as any).maxRequestsToMerge = maxQueuedRequests;
    });

    afterEach(() => {
        MockDate.reset();
        runMetadataConfigMock.verifyAll();
        reportGeneratorRequestProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        requestSelectorMock.verifyAll();
        reportProcessorMock.verifyAll();
        reportGeneratorRunnerTelemetryManagerMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('generate report success case', async () => {
        const queuedRequests = createQueuedRequests(reportGeneratorRequests);
        setupGetQueuedRequests(queuedRequests);
        setupTryUpdateRequestsWithRunningState(reportGeneratorRequests);
        const reportRequestsWithReportProcessorResult = setupReportProcessorMock(reportGeneratorRequests);
        setupTryUpdateRequestsWithFailedState(reportRequestsWithReportProcessorResult);
        setupDeleteRequests(reportRequestsWithReportProcessorResult);
        setupSetScanRunStatesOnCompletion(reportRequestsWithReportProcessorResult);

        await runner.run();
    });

    it('should set state to `failed` for failed report processing requests', async () => {
        reportGeneratorRequests = [
            {
                id: 'id-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                condition: 'pending',
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                condition: 'pending',
            },
        ] as ReportGeneratorRequestMockType[];
        const resultRequestsUpdateByReportProcessor = [
            {
                id: 'id-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'failed',
                },
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'completed',
                },
            },
        ] as ReportGeneratorRequestMockType[];
        const queuedRequests = createQueuedRequests(reportGeneratorRequests);
        setupGetQueuedRequests(queuedRequests);
        setupTryUpdateRequestsWithRunningState(reportGeneratorRequests);
        const reportRequestsWithReportProcessorResult = setupReportProcessorMock(
            reportGeneratorRequests,
            resultRequestsUpdateByReportProcessor,
        );
        setupTryUpdateRequestsWithFailedState(reportRequestsWithReportProcessorResult);
        setupDeleteRequests(reportRequestsWithReportProcessorResult);
        setupSetScanRunStatesOnCompletion(reportRequestsWithReportProcessorResult);

        await runner.run();
    });
});

function createQueuedRequests(requests: ReportGeneratorRequestMockType[]): QueuedRequests {
    const queuedRequests: QueuedRequests = {
        requestsToProcess: [],
        requestsToDelete: [],
    };
    requests.map((request) => {
        if (request.condition === 'completed') {
            queuedRequests.requestsToDelete.push({
                request: getCloneRequest(request),
                condition: 'completed',
                error: request.run?.error as string,
            } as QueuedRequest);
        } else {
            queuedRequests.requestsToProcess.push({
                request: getCloneRequest(request),
                condition: 'pending',
                error: request.run?.error as string,
            } as QueuedRequest);
        }
    });

    return queuedRequests;
}

function setupTryUpdateRequestsWithRunningState(
    requests: ReportGeneratorRequestMockType[],
    resultRequests: ReportGeneratorRequestMockType[] = undefined,
): void {
    const requestsToProcess = requests.filter((r) => r.run?.state !== 'completed');
    const dbDocuments = requestsToProcess.map((request) => {
        const reportRequest = {
            id: request.id,
            run: {
                state: 'running',
                timestamp: dateNow.toJSON(),
                error: null,
                retryCount: request.run?.retryCount !== undefined ? request.run.retryCount + 1 : 0,
            },
        } as Partial<ReportGeneratorRequest>;

        const scanResult = {
            id: request.scanId,
            subRuns: {
                report: {
                    id: request.id,
                    state: 'running',
                    timestamp: dateNow.toJSON(),
                    retryCount: request.run?.retryCount !== undefined ? request.run.retryCount + 1 : 0,
                    error: null,
                },
            },
        } as Partial<OnDemandPageScanResult>;

        return {
            reportRequest,
            scanResult,
        };
    });
    const updatedRequests = (resultRequests ?? requests).map((request) => {
        return {
            succeeded: true,
            result: getCloneRequest(request),
        } as OperationResult<ReportGeneratorRequest>;
    });
    reportGeneratorRequestProviderMock
        .setup((o) => o.tryUpdateRequests(It.isValue(dbDocuments.map((d) => d.reportRequest))))
        .returns(() => Promise.resolve(updatedRequests))
        .verifiable();
    onDemandPageScanRunResultProviderMock
        .setup((o) => o.tryUpdateScanRuns(It.isValue(dbDocuments.map((d) => d.scanResult))))
        .returns(() => Promise.resolve([]))
        .verifiable();
}

function setupTryUpdateRequestsWithFailedState(
    requests: ReportGeneratorRequestMockType[],
    resultRequests: ReportGeneratorRequestMockType[] = undefined,
): void {
    const requestsToProcess = requests.filter((r) => r.run?.state !== 'completed');
    const dbDocuments = requestsToProcess.map((request) => {
        const reportRequest = {
            id: request.id,
            run: {
                state: 'failed',
                timestamp: dateNow.toJSON(),
                error: isEmpty(request.run?.error) ? null : request.run.error.toString().substring(0, 2048),
            },
        } as Partial<ReportGeneratorRequest>;

        const scanResult = {
            id: request.scanId,
            subRuns: {
                report: {
                    state: 'failed',
                    timestamp: dateNow.toJSON(),
                    error: isEmpty(request.run?.error) ? null : request.run.error.toString().substring(0, 2048),
                },
            },
        } as Partial<OnDemandPageScanResult>;

        return {
            reportRequest,
            scanResult,
        };
    });
    const updatedRequests = (resultRequests ?? requests).map((request) => {
        return {
            succeeded: true,
            result: getCloneRequest(request),
        } as OperationResult<ReportGeneratorRequest>;
    });
    reportGeneratorRequestProviderMock
        .setup((o) => o.tryUpdateRequests(It.isValue(dbDocuments.map((d) => d.reportRequest))))
        .returns(() => Promise.resolve(updatedRequests))
        .verifiable();
    onDemandPageScanRunResultProviderMock
        .setup((o) => o.tryUpdateScanRuns(It.isValue(dbDocuments.map((d) => d.scanResult))))
        .returns(() => Promise.resolve([]))
        .verifiable();
}

function setupSetScanRunStatesOnCompletion(queuedRequests: ReportGeneratorRequest[]): void {
    let id = 0;
    const requestsToProcess = queuedRequests.filter((r) => r.run?.state === 'completed');

    requestsToProcess.map((request) => {
        const scansToUpdate = {
            id: request.scanId,
            run: {
                state: request.run?.state,
                timestamp: dateNow.toJSON(),
                error: isEmpty(request.run?.error) ? null : request.run.error.toString().substring(0, 2048),
            },
            subRuns: {
                report: {
                    state: request.run?.state,
                    timestamp: dateNow.toJSON(),
                    error: isEmpty(request.run?.error) ? null : request.run.error.toString().substring(0, 2048),
                    retryCount: request.run?.retryCount,
                },
            },
        } as Partial<OnDemandPageScanResult>;

        const websiteScanRefId = `websiteScanId-${id++}`;
        const pageScanResultUpdated = {
            succeeded: true,
            result: {
                id: request.scanId,
                url: 'url',
                scanResult: {
                    state: 'pass',
                },
                run: {
                    state: request.run?.state,
                },
                websiteScanRefs: [
                    {
                        id: websiteScanRefId,
                        scanGroupId: request.scanGroupId,
                        scanGroupType: 'deep-scan',
                    },
                ],
            } as OnDemandPageScanResult,
        };

        onDemandPageScanRunResultProviderMock
            .setup((o) => o.tryUpdateScanRun(It.isValue(scansToUpdate)))
            .returns(() => Promise.resolve(pageScanResultUpdated))
            .verifiable();

        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanRefId,
            pageScans: [
                {
                    scanId: pageScanResultUpdated.result.id,
                    url: pageScanResultUpdated.result.url,
                    scanState: pageScanResultUpdated.result.scanResult?.state,
                    runState: pageScanResultUpdated.result.run.state,
                    timestamp: dateNow.toJSON(),
                },
            ],
        };
        websiteScanResultProviderMock
            .setup((o) => o.mergeOrCreate(pageScanResultUpdated.result.id, updatedWebsiteScanResult, It.isAny()))
            .returns(() => Promise.resolve(updatedWebsiteScanResult as WebsiteScanResult))
            .verifiable();

        const runnerScanMetadata: RunnerScanMetadata = {
            id: pageScanResultUpdated.result.id,
            url: pageScanResultUpdated.result.url,
            deepScan: updatedWebsiteScanResult?.deepScanId !== undefined ? true : false,
        };
        scanNotificationProcessorMock
            .setup((o) =>
                o.sendScanCompletionNotification(
                    It.isValue(runnerScanMetadata),
                    It.isValue(pageScanResultUpdated.result),
                    It.isValue(updatedWebsiteScanResult as WebsiteScanResult),
                ),
            )
            .returns(() => Promise.resolve())
            .verifiable();
    });
}

function setupDeleteRequests(queuedRequests: ReportGeneratorRequest[]): void {
    const requestsToProcess = queuedRequests.filter((r) => r.run?.state === 'completed');
    reportGeneratorRequestProviderMock
        .setup((o) => o.deleteRequests(It.isValue(requestsToProcess.map((r) => r.id))))
        .returns(() => Promise.resolve(undefined))
        .verifiable();
}

function setupGetQueuedRequests(queuedRequests: QueuedRequests): void {
    requestSelectorMock
        .setup((o) => o.getQueuedRequests(reportGeneratorMetadata.scanGroupId, maxQueuedRequests, (runner as any).maxRequestsToDelete))
        .returns(() => Promise.resolve(queuedRequests))
        .verifiable();
}

function setupReportProcessorMock(
    requests: ReportGeneratorRequestMockType[],
    resultRequests: ReportGeneratorRequestMockType[] = undefined,
): ReportGeneratorRequest[] {
    const requestsToProcess = requests.filter((r) => r.run?.state !== 'completed');
    const requestsToUpdate = requestsToProcess.map((request) => {
        return {
            request: getCloneRequest(request),
            condition: request.condition,
            error: request.run?.error,
        } as QueuedRequest;
    });

    let updatedRequests: QueuedRequest[];
    if (resultRequests) {
        updatedRequests = resultRequests.map((request) => {
            return {
                request: getCloneRequest(request),
                condition: request.condition,
                error: request.run?.error,
            } as QueuedRequest;
        });
    } else {
        updatedRequests = requestsToProcess.map((request) => {
            return {
                request: getCloneRequest(request),
                condition: 'completed',
                error: request.run?.error,
            } as QueuedRequest;
        });
    }
    reportProcessorMock
        .setup((o) => o.generate(reportGeneratorMetadata.targetReport, It.isValue(requestsToUpdate)))
        .returns(() => Promise.resolve(updatedRequests))
        .verifiable();

    // set incoming state in sync with oncoming
    const projectedReportGeneratorRequests = requests.map((request) => {
        const projectedRequest = cloneDeep(request);
        const updatedRequest = updatedRequests.find((r) => r.request.id === projectedRequest.id);
        if (updatedRequest) {
            projectedRequest.run = {
                ...projectedRequest.run,
                state: updatedRequest.condition as ReportScanRunState,
            };
        }

        return projectedRequest;
    });

    return projectedReportGeneratorRequests;
}

function getCloneRequest(request: ReportGeneratorRequestMockType): ReportGeneratorRequest {
    const requestClone = cloneDeep(request);
    delete requestClone.condition;

    return requestClone;
}
