// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import { ReportGeneratorRequestProvider, OnDemandPageScanRunResultProvider, OperationResult } from 'service-library';
import { GlobalLogger } from 'logger';
import { ReportGeneratorRequest, OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import * as MockDate from 'mockdate';
import { isEmpty, cloneDeep } from 'lodash';
import { RunMetadataConfig } from '../run-metadata-config';
import { ReportGeneratorRunnerTelemetryManager } from '../report-generator-runner-telemetry-manager';
import { ReportGeneratorMetadata } from '../types/report-generator-metadata';
import { ReportProcessor } from '../report-processor/report-processor';
import { RequestSelector, QueuedRequests, QueuedRequest } from './request-selector';
import { Runner } from './runner';

const maxQueuedRequests = 10;

let runMetadataConfigMock: IMock<RunMetadataConfig>;
let reportGeneratorRequestProviderMock: IMock<ReportGeneratorRequestProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let requestSelectorMock: IMock<RequestSelector>;
let reportProcessorMock: IMock<ReportProcessor>;
let reportGeneratorRunnerTelemetryManagerMock: IMock<ReportGeneratorRunnerTelemetryManager>;
let loggerMock: IMock<GlobalLogger>;
let runner: Runner;
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
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'pending',
                },
                scanRunState: 'completed',
            },
            {
                id: 'id-2',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'pending',
                },
                scanRunState: 'completed',
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'completed',
                },
                scanRunState: 'failed',
            },
        ] as ReportGeneratorRequest[];

        runMetadataConfigMock = Mock.ofType<RunMetadataConfig>();
        reportGeneratorRequestProviderMock = Mock.ofType<ReportGeneratorRequestProvider>();
        onDemandPageScanRunResultProviderMock = Mock.ofType<OnDemandPageScanRunResultProvider>();
        requestSelectorMock = Mock.ofType<RequestSelector>();
        reportProcessorMock = Mock.ofType<ReportProcessor>();
        reportGeneratorRunnerTelemetryManagerMock = Mock.ofType<ReportGeneratorRunnerTelemetryManager>();
        loggerMock = Mock.ofType<GlobalLogger>();

        reportGeneratorMetadata = {
            targetReport: 'accessibility',
            scanGroupId: 'scanGroupId',
        } as ReportGeneratorMetadata;
        runMetadataConfigMock
            .setup((o) => o.getConfig())
            .returns(() => reportGeneratorMetadata)
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
            requestSelectorMock.object,
            reportProcessorMock.object,
            reportGeneratorRunnerTelemetryManagerMock.object,
            loggerMock.object,
        );
        runner.maxQueuedRequests = maxQueuedRequests;
    });

    afterEach(() => {
        MockDate.reset();
        runMetadataConfigMock.verifyAll();
        reportGeneratorRequestProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        requestSelectorMock.verifyAll();
        reportProcessorMock.verifyAll();
        reportGeneratorRunnerTelemetryManagerMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('generate report success case', async () => {
        const queuedRequests = createQueuedRequests(reportGeneratorRequests);
        setupGetQueuedRequests(queuedRequests);
        setupTryUpdateRequestsWithRunningState(reportGeneratorRequests);
        const reportRequestsWithReportProcessorResult = setupReportProcessorMock(reportGeneratorRequests);
        setupTryUpdateRequestsWithFailedState(reportRequestsWithReportProcessorResult);
        setupDeleteRequests(reportRequestsWithReportProcessorResult);
        setupSetScanRunStatesToCompleted(reportRequestsWithReportProcessorResult);

        await runner.run();
    });

    it('should skip queued requests failed `running` state update', async () => {
        const resultRequestsUpdateWithRunningState = [
            {
                id: 'id-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'pending',
                },
                scanRunState: 'completed',
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'completed',
                },
                scanRunState: 'failed',
            },
        ] as ReportGeneratorRequest[];
        const queuedRequests = createQueuedRequests(reportGeneratorRequests);
        setupGetQueuedRequests(queuedRequests);
        setupTryUpdateRequestsWithRunningState(reportGeneratorRequests, resultRequestsUpdateWithRunningState);
        const reportRequestsWithReportProcessorResult = setupReportProcessorMock(resultRequestsUpdateWithRunningState);
        setupTryUpdateRequestsWithFailedState(reportRequestsWithReportProcessorResult);
        setupDeleteRequests(reportRequestsWithReportProcessorResult);
        setupSetScanRunStatesToCompleted(reportRequestsWithReportProcessorResult);

        await runner.run();
    });

    it('should set state to `failed` for failed report processing requests', async () => {
        reportGeneratorRequests = [
            {
                id: 'id-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'pending',
                },
                scanRunState: 'completed',
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'pending',
                },
                scanRunState: 'completed',
            },
        ] as ReportGeneratorRequest[];
        const resultRequestsUpdateByReportProcessor = [
            {
                id: 'id-1',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'failed',
                },
                scanRunState: 'completed',
            },
            {
                id: 'id-3',
                scanGroupId: 'scanGroupId-1',
                reports: [{}],
                run: {
                    state: 'completed',
                },
                scanRunState: 'completed',
            },
        ] as ReportGeneratorRequest[];
        const queuedRequests = createQueuedRequests(reportGeneratorRequests);
        setupGetQueuedRequests(queuedRequests);
        setupTryUpdateRequestsWithRunningState(reportGeneratorRequests);
        const reportRequestsWithReportProcessorResult = setupReportProcessorMock(
            reportGeneratorRequests,
            resultRequestsUpdateByReportProcessor,
        );
        setupTryUpdateRequestsWithFailedState(reportRequestsWithReportProcessorResult);
        setupDeleteRequests(reportRequestsWithReportProcessorResult);
        setupSetScanRunStatesToCompleted(reportRequestsWithReportProcessorResult);

        await runner.run();
    });
});

function createQueuedRequests(requests: ReportGeneratorRequest[]): QueuedRequests {
    const queuedRequests: QueuedRequests = {
        requestsToProcess: [],
        requestsToDelete: [],
    };
    requests.map((request) => {
        if (request.run?.state === 'completed') {
            queuedRequests.requestsToDelete.push({
                request,
                condition: 'completed',
                error: request.run?.error as string,
            } as QueuedRequest);
        } else {
            queuedRequests.requestsToProcess.push({
                request,
                condition: 'pending',
                error: request.run?.error as string,
            } as QueuedRequest);
        }
    });

    return queuedRequests;
}

function setupTryUpdateRequestsWithRunningState(
    requests: ReportGeneratorRequest[],
    resultRequests: ReportGeneratorRequest[] = undefined,
): void {
    const requestsToProcess = requests.filter((r) => r.run.state !== 'completed');
    const requestsToUpdate = requestsToProcess.map((request) => {
        return {
            id: request.id,
            run: {
                state: 'running',
                timestamp: dateNow.toJSON(),
                error: null,
                retryCount: request.run?.retryCount !== undefined ? request.run.retryCount + 1 : 0,
            },
        } as Partial<ReportGeneratorRequest>;
    });
    const updatedRequests = (resultRequests ?? requests).map((request) => {
        return {
            succeeded: true,
            result: request,
        } as OperationResult<ReportGeneratorRequest>;
    });

    reportGeneratorRequestProviderMock
        .setup((o) => o.tryUpdateRequests(It.isValue(requestsToUpdate)))
        .returns(() => Promise.resolve(updatedRequests))
        .verifiable();
}

function setupTryUpdateRequestsWithFailedState(
    requests: ReportGeneratorRequest[],
    resultRequests: ReportGeneratorRequest[] = undefined,
): void {
    const requestsToProcess = requests.filter((r) => r.run.state !== 'completed');
    const requestsToUpdate = requestsToProcess.map((request) => {
        return {
            id: request.id,
            run: {
                state: 'failed',
                timestamp: dateNow.toJSON(),
                error: isEmpty(request.run.error) ? null : request.run.error.toString().substring(0, 2048),
            },
        } as Partial<ReportGeneratorRequest>;
    });
    const updatedRequests = (resultRequests ?? requests).map((request) => {
        return {
            succeeded: true,
            result: request,
        } as OperationResult<ReportGeneratorRequest>;
    });
    reportGeneratorRequestProviderMock
        .setup((o) => o.tryUpdateRequests(It.isValue(requestsToUpdate)))
        .returns(() => Promise.resolve(updatedRequests))
        .verifiable();
}

function setupSetScanRunStatesToCompleted(queuedRequests: ReportGeneratorRequest[]): void {
    const requestsToProcess = queuedRequests.filter((r) => r.run.state === 'completed');
    const requestsToUpdate = requestsToProcess.map((request) => {
        return {
            id: request.id,
            run: {
                state: request.scanRunState === 'completed' ? request.run.state : request.scanRunState,
                timestamp: dateNow.toJSON(),
                error: isEmpty(request.run.error) ? null : request.run.error.toString().substring(0, 2048),
            },
            reports: request.reports,
        } as Partial<OnDemandPageScanResult>;
    });
    onDemandPageScanRunResultProviderMock
        .setup((o) => o.tryUpdateScanRuns(It.isValue(requestsToUpdate)))
        .returns(() => Promise.resolve(undefined))
        .verifiable();
}

function setupDeleteRequests(queuedRequests: ReportGeneratorRequest[]): void {
    const requestsToProcess = queuedRequests.filter((r) => r.run.state === 'completed');
    reportGeneratorRequestProviderMock
        .setup((o) => o.deleteRequests(It.isValue(requestsToProcess.map((r) => r.id))))
        .returns(() => Promise.resolve(undefined))
        .verifiable();
}

function setupGetQueuedRequests(queuedRequests: QueuedRequests): void {
    requestSelectorMock
        .setup((o) => o.getQueuedRequests(reportGeneratorMetadata.scanGroupId, maxQueuedRequests))
        .returns(() => Promise.resolve(queuedRequests))
        .verifiable();
}

function setupReportProcessorMock(
    requests: ReportGeneratorRequest[],
    resultRequests: ReportGeneratorRequest[] = undefined,
): ReportGeneratorRequest[] {
    const requestsToProcess = requests.filter((r) => r.run.state !== 'completed');
    const requestsToUpdate = requestsToProcess.map((request) => {
        return {
            request,
            condition: request.run.state,
            error: request.run.error,
        } as QueuedRequest;
    });
    let updatedRequests: QueuedRequest[];
    if (resultRequests) {
        updatedRequests = resultRequests.map((request) => {
            return {
                request,
                condition: request.run.state,
                error: request.run.error,
            } as QueuedRequest;
        });
    } else {
        updatedRequests = requestsToProcess.map((request) => {
            return {
                request,
                condition: 'completed',
                error: request.run.error,
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
            projectedRequest.run.state = updatedRequest.condition as OnDemandPageScanRunState;
        }

        return projectedRequest;
    });

    return projectedReportGeneratorRequests;
}
