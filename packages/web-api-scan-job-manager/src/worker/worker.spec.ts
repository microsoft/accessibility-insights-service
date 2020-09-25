// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import {
    Batch,
    BatchConfig,
    BatchTask,
    JobTask,
    JobTaskState,
    PoolLoadGenerator,
    PoolLoadSnapshot,
    PoolMetricsInfo,
    Queue,
    StorageConfig,
} from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration } from 'common';
import * as _ from 'lodash';
import * as mockDate from 'mockdate';
import { BatchPoolLoadSnapshotProvider, OnDemandPageScanRunResultProvider, ScanMessage } from 'service-library';
import { OnDemandPageScanResult, OnDemandPageScanRunState, OnDemandScanRequestMessage, StorageDocument } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { Worker } from './worker';

/* eslint-disable no-invalid-this, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any, no-bitwise */

enum EnableBaseWorkflow {
    none,
    onTasksAdded = 1 << 1,
    excludeCompletedScans = 1 << 2,
    handleFailedTasks = 1 << 3,
}

class TestableWorker extends Worker {
    public enableBaseWorkflow: EnableBaseWorkflow;

    public onTasksAddedCallback: (tasks: JobTask[]) => Promise<void>;
    public excludeCompletedScansCallback: (scanMessages: ScanMessage[]) => Promise<ScanMessage[]>;
    public handleFailedTasksCallback: (failedTasks: BatchTask[]) => Promise<void>;
    public activeScanMessages: ScanMessage[];

    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        return super.getMessagesForTaskCreation();
    }

    public async onTasksValidation(): Promise<void> {
        return super.handleFailedTasks([]);
    }

    public async handleFailedTasks(failedTasks: BatchTask[]): Promise<void> {
        await this.invokeOverrides(
            EnableBaseWorkflow.handleFailedTasks,
            this.handleFailedTasksCallback,
            async () => super.handleFailedTasks(failedTasks),
            undefined,
            failedTasks,
        );
    }

    public async onTasksAdded(tasks: JobTask[]): Promise<void> {
        await this.invokeOverrides(
            EnableBaseWorkflow.onTasksAdded,
            this.onTasksAddedCallback,
            async () => super.onTasksAdded(tasks),
            undefined,
            tasks,
        );
    }

    public async excludeCompletedScans(scanMessages: ScanMessage[]): Promise<ScanMessage[]> {
        return this.invokeOverrides(
            EnableBaseWorkflow.excludeCompletedScans,
            this.excludeCompletedScansCallback,
            async () => super.excludeCompletedScans(scanMessages),
            [],
            scanMessages,
        );
    }

    private async invokeOverrides(
        workflow: EnableBaseWorkflow,
        callback: any,
        baseWorkflow?: any,
        defaultResult?: any,
        ...params: any
    ): Promise<any> {
        if (callback !== undefined) {
            return callback(...params);
        }

        if ((this.enableBaseWorkflow & workflow) === workflow) {
            return baseWorkflow(...params);
        }

        return defaultResult;
    }
}

class QueueMessagesGenerator {
    public scanMessagesByRun: ScanMessage[][] = [];
    public scanMessages: ScanMessage[] = [];
    public jobTasksByRun: JobTask[][] = [];
    public jobTasks: JobTask[] = [];
    public runCount = 0;
    public maxRunCount = 2;
    public messagesPerRun = 3;

    public queueMessagesGeneratorFn = () => () => {
        let messages: ScanMessage[] = [];
        if (this.runCount < this.maxRunCount) {
            messages = createScanMessages(this.messagesPerRun, this.runCount * this.maxRunCount);
            this.scanMessagesByRun[this.runCount] = messages;
            this.scanMessages.push(...messages);
            this.runCount += 1;
        }

        return messages;
    };

    public jobTaskGeneratorFn = () => () => {
        if (this.runCount === 0) {
            return [];
        }

        const jobTasks = createJobTasks(this.scanMessagesByRun[this.runCount - 1]);
        this.jobTasksByRun[this.runCount - 1] = jobTasks;
        this.jobTasks.push(...jobTasks);

        return jobTasks;
    };
}

const messageVisibilityTimeout = 600;
const dateNowIso = '2019-12-12T12:00:00.000Z';
mockDate.set(dateNowIso);

let testSubject: TestableWorker;
let batchMock: IMock<Batch>;
let queueMock: IMock<Queue>;
let poolLoadGeneratorMock: IMock<PoolLoadGenerator>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<MockableLogger>;
let batchPoolLoadSnapshotProviderMock: IMock<BatchPoolLoadSnapshotProvider>;
let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
let storageConfigStub: StorageConfig;
let poolMetricsInfo: PoolMetricsInfo;
let batchConfig: BatchConfig;
let queueMessagesGenerator: QueueMessagesGenerator;

describe(Worker, () => {
    beforeEach(() => {
        batchConfig = {
            accountName: 'batch-account-name',
            accountUrl: '',
            poolId: 'pool-Id',
            jobId: 'batch-job-id',
        };

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 0,
                runningTasks: 1,
            },
        };

        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        poolLoadGeneratorMock = Mock.ofType(PoolLoadGenerator);
        batchPoolLoadSnapshotProviderMock = Mock.ofType(BatchPoolLoadSnapshotProvider);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider);

        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        setupServiceConfigMock(messageVisibilityTimeout);

        storageConfigStub = {
            scanQueue: 'scan-queue',
        } as StorageConfig;
        loggerMock = Mock.ofType(MockableLogger);

        batchMock.setup((o) => o.getPoolMetricsInfo()).returns(async () => Promise.resolve(poolMetricsInfo));
        queueMessagesGenerator = new QueueMessagesGenerator();

        testSubject = new TestableWorker(
            batchMock.object,
            queueMock.object,
            poolLoadGeneratorMock.object,
            batchPoolLoadSnapshotProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            batchConfig,
            serviceConfigMock.object,
            storageConfigStub,
            loggerMock.object,
        );
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        poolLoadGeneratorMock.verifyAll();
        batchPoolLoadSnapshotProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        serviceConfigMock.verifyAll();
        loggerMock.verifyAll();
    });

    afterAll(() => {
        mockDate.reset();
    });

    it('skip getting messages if pool has no available slots', async () => {
        const poolLoadSnapshot = {
            tasksIncrementCountPerInterval: 0,
            samplingIntervalInSeconds: 15,
        } as PoolLoadSnapshot;
        poolLoadGeneratorMock
            .setup((o) => o.getPoolLoadSnapshot(poolMetricsInfo))
            .returns(async () => Promise.resolve(poolLoadSnapshot))
            .verifiable();
        batchPoolLoadSnapshotProviderMock
            .setup((o) =>
                o.writeBatchPoolLoadSnapshot(
                    It.isValue({
                        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                        ...({} as StorageDocument),
                        batchAccountName: batchConfig.accountName,
                        ...poolLoadSnapshot,
                    }),
                ),
            )
            .verifiable();
        loggerMock
            .setup((o) =>
                o.trackEvent(
                    'BatchPoolStats',
                    null,
                    It.isValue({
                        runningTasks: poolMetricsInfo.load.runningTasks,
                        samplingIntervalInSeconds: poolLoadSnapshot.samplingIntervalInSeconds,
                        maxParallelTasks: poolMetricsInfo.maxTasksPerPool,
                    }),
                ),
            )
            .verifiable();

        const actualMessages = await testSubject.getMessagesForTaskCreation();

        expect(actualMessages).toEqual([]);
    });

    it('get messages from a queue', async () => {
        const poolLoadSnapshot = {
            tasksIncrementCountPerInterval: 10,
            samplingIntervalInSeconds: 15,
        } as PoolLoadSnapshot;
        poolLoadGeneratorMock
            .setup((o) => o.getPoolLoadSnapshot(poolMetricsInfo))
            .returns(async () => Promise.resolve(poolLoadSnapshot))
            .verifiable();
        batchPoolLoadSnapshotProviderMock
            .setup((o) =>
                o.writeBatchPoolLoadSnapshot(
                    It.isValue({
                        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                        ...({} as StorageDocument),
                        batchAccountName: batchConfig.accountName,
                        ...poolLoadSnapshot,
                    }),
                ),
            )
            .verifiable();

        queueMessagesGenerator.queueMessagesGeneratorFn()();
        queueMock
            .setup((o) => o.getMessagesWithTotalCount(testSubject.getQueueName(), poolLoadSnapshot.tasksIncrementCountPerInterval))
            .returns(async () => Promise.resolve(queueMessagesGenerator.scanMessages.map((m) => m.message)))
            .verifiable();

        loggerMock
            .setup((o) =>
                o.trackEvent(
                    'BatchPoolStats',
                    null,
                    It.isValue({
                        runningTasks: poolMetricsInfo.load.runningTasks,
                        samplingIntervalInSeconds: poolLoadSnapshot.samplingIntervalInSeconds,
                        maxParallelTasks: poolMetricsInfo.maxTasksPerPool,
                    }),
                ),
            )
            .verifiable();

        testSubject.excludeCompletedScans = jest.fn().mockImplementation((m) => m);

        const actualMessages = await testSubject.getMessagesForTaskCreation();

        expect(actualMessages).toEqual(queueMessagesGenerator.scanMessages);
        expect(testSubject.excludeCompletedScans).toHaveBeenCalledTimes(1);
    });

    it('update pool stats when tasks added', async () => {
        const tasks = [{}, {}, {}];
        poolLoadGeneratorMock.setup((o) => o.setLastTasksIncrementCount(tasks.length)).verifiable();
        testSubject.enableBaseWorkflow = EnableBaseWorkflow.onTasksAdded;

        await testSubject.onTasksAdded(tasks as JobTask[]);
    });

    it('handleFailedTasks() - skip if task has no scan id argument', async () => {
        const failedTasks = [
            {
                id: 'id',
                taskArguments: '{}',
            },
        ] as BatchTask[];

        loggerMock
            .setup((o) =>
                o.logError(
                    `Unable to update failed scan run result. Task has no scan id run arguments defined.`,
                    It.isValue({
                        correlatedBatchTaskId: failedTasks[0].id,
                        taskProperties: JSON.stringify(failedTasks[0]),
                    }),
                ),
            )
            .verifiable();

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.handleFailedTasks;

        await testSubject.handleFailedTasks(failedTasks);
    });

    it('handleFailedTasks() - skip if task has no scan id argument', async () => {
        const failedTasks = [
            {
                id: 'task-id-1',
                taskArguments: '{}',
            },
            {
                id: 'task-id-2',
                taskArguments: '{}',
            },
        ] as BatchTask[];

        failedTasks.map((task) => {
            loggerMock
                .setup((o) =>
                    o.logError(
                        `Unable to update failed scan run result. Task has no scan id run arguments defined.`,
                        It.isValue({
                            correlatedBatchTaskId: task.id,
                            taskProperties: JSON.stringify(task),
                        }),
                    ),
                )
                .verifiable();
        });

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.handleFailedTasks;

        await testSubject.handleFailedTasks(failedTasks);
    });

    it('handleFailedTasks() - skip if scan document not found in a storage', async () => {
        const failedTasks = [
            {
                id: 'task-id-1',
                taskArguments: JSON.stringify({ id: 'scan-id-1' }),
            },
            {
                id: 'task-id-2',
                taskArguments: JSON.stringify({ id: 'scan-id-2' }),
            },
        ] as BatchTask[];

        failedTasks.map((task) => {
            loggerMock
                .setup((o) =>
                    o.logError(
                        `Unable to find corresponding scan document in a result storage.`,
                        It.isValue({
                            correlatedBatchTaskId: task.id,
                            taskProperties: JSON.stringify(task),
                        }),
                    ),
                )
                .verifiable();
        });

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.handleFailedTasks;

        await testSubject.handleFailedTasks(failedTasks);
    });

    it('handleFailedTasks() - update scan document with task error', async () => {
        const failedTasks: BatchTask[] = [];
        const pageScanResults: OnDemandPageScanResult[] = [];

        for (let i = 0; i < 2; i += 1) {
            const scanId = `scan-id-${i}`;
            failedTasks.push({
                id: `task-id-${i}`,
                correlationId: scanId,
                exitCode: 1,
                timestamp: new Date(),
                failureInfo: {
                    category: 'serverError',
                    message: `failureInfo-message-${i}`,
                },
                taskArguments: JSON.stringify({ id: scanId }),
            } as BatchTask);

            const error = `Task was terminated unexpectedly. Exit code: 1`;
            const error2 = `${error}, Error category: serverError, Error details: ${failedTasks[0].failureInfo.message}`;
            pageScanResults.push({
                run: {
                    state: 'failed',
                    timestamp: new Date().toJSON(),
                    error: error2,
                },
            } as OnDemandPageScanResult);
        }

        failedTasks.map((task) => {
            onDemandPageScanRunResultProviderMock
                .setup((o) => o.readScanRun(task.correlationId))
                .returns(async () => Promise.resolve({} as OnDemandPageScanResult))
                .verifiable();
        });

        pageScanResults.map((scan) => {
            onDemandPageScanRunResultProviderMock.setup((o) => o.updateScanRun(scan)).verifiable();
        });

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.handleFailedTasks;

        await testSubject.handleFailedTasks(failedTasks);
    });

    it('excludeCompletedScans() - keep scan request when request has `queued` run state within allowed time span threshold', async () => {
        queueMessagesGenerator.queueMessagesGeneratorFn()();

        const scanResults = createScanResults(queueMessagesGenerator.scanMessages, 'queued');
        onDemandPageScanRunResultProviderMock
            .setup((o) => o.readScanRuns(queueMessagesGenerator.scanMessages.map((m) => m.scanId)))
            .returns(async () => Promise.resolve(scanResults))
            .verifiable();

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.excludeCompletedScans;

        const actualMessages = await testSubject.excludeCompletedScans(queueMessagesGenerator.scanMessages);

        expect(actualMessages).toEqual(queueMessagesGenerator.scanMessages);
    });

    it('excludeCompletedScans() - remove scan request when request has aborted run state', async () => {
        setupServiceConfigMock(-600); // set queue message as expired

        queueMessagesGenerator.messagesPerRun = 5;
        queueMessagesGenerator.queueMessagesGeneratorFn()();

        const scanResults = createScanResults(queueMessagesGenerator.scanMessages);
        onDemandPageScanRunResultProviderMock
            .setup((o) => o.readScanRuns(queueMessagesGenerator.scanMessages.map((m) => m.scanId)))
            .returns(async () => Promise.resolve(scanResults))
            .verifiable();

        const acceptedScans = scanResults.filter((r) => r.run.state !== 'completed');
        const expectedMessages = queueMessagesGenerator.scanMessages.filter((m) => acceptedScans.find((s) => s.id === m.scanId));

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.excludeCompletedScans;

        const actualMessages = await testSubject.excludeCompletedScans(queueMessagesGenerator.scanMessages);

        expect(actualMessages).toEqual(expectedMessages);
    });
});

function createScanResults(messages: ScanMessage[], runState?: OnDemandPageScanRunState): OnDemandPageScanResult[] {
    const stateGeneratorFn = (seed: number): OnDemandPageScanRunState => {
        if (seed === 2) {
            return 'running';
        } else if (seed === 3) {
            return 'failed';
        } else if (seed === 4) {
            return 'completed';
        }

        return 'queued';
    };

    let count = 0;

    return messages.map((m) => {
        count += 1;

        return {
            id: m.scanId,
            run: {
                state: runState === undefined ? stateGeneratorFn(count) : runState,
                timestamp: new Date().toISOString(),
            },
        } as OnDemandPageScanResult;
    });
}

function createJobTasks(messages: ScanMessage[]): JobTask[] {
    let count = 0;

    const stateGeneratorFn = (seed: number): JobTaskState => {
        if (seed === 2) {
            return JobTaskState.failed;
        } else if (seed === 3) {
            return JobTaskState.completed;
        }

        return JobTaskState.queued;
    };

    return messages.map((m) => {
        count += 1;

        return {
            id: `task-id-${m.scanId}_${m.messageId}_${Date.now}`,
            correlationId: m.messageId,
            state: stateGeneratorFn(count),
        } as JobTask;
    });
}

function createScanMessages(count: number, shift: number = 0): ScanMessage[] {
    const scanMessages: ScanMessage[] = [];
    for (let i = shift; i < count + shift; i += 1) {
        scanMessages.push({
            scanId: `scan-id-${i}`,
            messageId: `message-id-${i}`,
            message: {
                messageId: `message-id-${i}`,
                messageText: JSON.stringify(<OnDemandScanRequestMessage>{
                    id: `scan-id-${i}`,
                    url: 'https://localhost/',
                }),
                popReceipt: `pop-receipt-${i}`,
            },
        });
    }

    return scanMessages;
}

function setupServiceConfigMock(timeout: number): void {
    serviceConfigMock.reset();
    serviceConfigMock
        .setup(async (o) => o.getConfigValue('queueConfig'))
        .returns(async () => Promise.resolve(<QueueRuntimeConfig>(<unknown>{ messageVisibilityTimeoutInSeconds: timeout })));
}
