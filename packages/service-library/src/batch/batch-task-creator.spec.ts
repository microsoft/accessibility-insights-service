// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Batch, BatchConfig, BatchTask, getTaskCorrelationId, JobTask, JobTaskState, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, QueueRuntimeConfig, ServiceConfiguration, System } from 'common';
import * as _ from 'lodash';
import { Logger } from 'logger';
import * as mockDate from 'mockdate';
import { OnDemandScanRequestMessage } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { BatchTaskCreator, ScanMessage } from './batch-task-creator';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion no-any no-null-keyword no-unnecessary-override no-bitwise

enum EnableBaseWorkflow {
    none,
    waitForChildTasks = 1 << 1,
    validateTasks = 1 << 2,
    addTasksToJob = 1 << 3,
    handleFailedTasks = 1 << 4,
    getMessagesForTaskCreation = 1 << 5,
    onTasksAdded = 1 << 6,
    onExit = 1 << 7,
    getJobPendingTasksCount = 1 << 8,
    deleteScanQueueMessagesForSucceededTasks = 1 << 9,
}

class TestableBatchTaskCreator extends BatchTaskCreator {
    public enableBaseWorkflow: EnableBaseWorkflow;

    public getMessagesForTaskCreationCallback: () => ScanMessage[];
    public onTasksAddedCallback: (tasks: JobTask[]) => Promise<void>;
    public addTasksToJobCallback: (messages: ScanMessage[]) => Promise<JobTask[]>;
    public handleFailedTasksCallback: (failedTasks: BatchTask[]) => Promise<void>;
    public onExitCallback: () => Promise<void>;
    public waitForChildTasksCallback: () => Promise<void>;
    public validateTasksCallback: () => Promise<void>;
    public getJobPendingTasksCountCallback: () => Promise<void>;
    public deleteScanQueueMessagesForSucceededTasksCallback: (scanMessages: ScanMessage[]) => Promise<void>;

    public get activeScanMessages(): ScanMessage[] {
        return super.activeScanMessages;
    }
    public set activeScanMessages(messages: ScanMessage[]) {
        super.activeScanMessages = messages;
    }

    public getQueueName(): string {
        return 'queue-name';
    }

    public async getQueueConfig(): Promise<QueueRuntimeConfig> {
        return super.getQueueConfig();
    }

    public async waitForChildTasks(): Promise<void> {
        await this.invokeOverrides(EnableBaseWorkflow.waitForChildTasks, this.waitForChildTasksCallback, async () =>
            super.waitForChildTasks(),
        );
    }

    public async getJobPendingTasksCount(): Promise<number> {
        return this.invokeOverrides(EnableBaseWorkflow.getJobPendingTasksCount, this.getJobPendingTasksCountCallback, async () =>
            super.getJobPendingTasksCount(),
        );
    }

    public async addTasksToJob(messages: ScanMessage[]): Promise<JobTask[]> {
        return this.invokeOverrides(
            EnableBaseWorkflow.addTasksToJob,
            this.addTasksToJobCallback,
            async (scanMessages: ScanMessage[]) => super.addTasksToJob(scanMessages),
            [],
            messages,
        );
    }

    public async deleteScanQueueMessagesForSucceededTasks(scanMessages: ScanMessage[]): Promise<void> {
        return this.invokeOverrides(
            EnableBaseWorkflow.deleteScanQueueMessagesForSucceededTasks,
            this.deleteScanQueueMessagesForSucceededTasksCallback,
            async () => super.deleteScanQueueMessagesForSucceededTasks(scanMessages),
            undefined,
            scanMessages,
        );
    }

    public async validateTasks(): Promise<void> {
        await this.invokeOverrides(EnableBaseWorkflow.validateTasks, this.validateTasksCallback, async () => super.validateTasks());
    }

    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        return this.invokeOverrides(EnableBaseWorkflow.getMessagesForTaskCreation, this.getMessagesForTaskCreationCallback, undefined, []);
    }

    public async onTasksAdded(tasks: JobTask[]): Promise<void> {
        await this.invokeOverrides(EnableBaseWorkflow.onTasksAdded, this.onTasksAddedCallback, undefined, undefined, tasks);
    }

    public async handleFailedTasks(failedTasks: BatchTask[]): Promise<void> {
        await this.invokeOverrides(EnableBaseWorkflow.handleFailedTasks, this.handleFailedTasksCallback, undefined, undefined, failedTasks);
    }

    public async onExit(): Promise<void> {
        await this.invokeOverrides(EnableBaseWorkflow.onExit, this.onExitCallback);
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

const dateNowIso = '2019-12-12T12:00:00.000Z';
mockDate.set(dateNowIso);

let batchMock: IMock<Batch>;
let queueMock: IMock<Queue>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
let systemMock: IMock<typeof System>;
let batchConfig: BatchConfig;
let testSubject: TestableBatchTaskCreator;
let jobManagerConfig: JobManagerConfig;
let maxWallClockTimeInHours: number;
let poolMetricsInfo: PoolMetricsInfo;

describe(BatchTaskCreator, () => {
    beforeEach(() => {
        maxWallClockTimeInHours = 2;
        batchConfig = {
            accountName: 'account-name',
            accountUrl: '',
            poolId: 'pool-id',
            jobId: 'job-id',
        };
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        systemMock = Mock.ofInstance({
            wait: async (ms) => {
                return;
            },
        } as typeof System);

        jobManagerConfig = {
            maxWallClockTimeInHours: maxWallClockTimeInHours,
            addTasksIntervalInSeconds: 10,
        } as JobManagerConfig;
        serviceConfigMock.setup((o) => o.getConfigValue('jobManagerConfig')).returns(async () => Promise.resolve(jobManagerConfig));

        batchMock.setup((o) => o.createJobIfNotExists(batchConfig.jobId, true)).returns(async () => Promise.resolve(batchConfig.jobId));

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 0,
                runningTasks: 1,
            },
        };
        batchMock.setup((o) => o.getPoolMetricsInfo()).returns(async () => Promise.resolve(poolMetricsInfo));

        testSubject = new TestableBatchTaskCreator(
            batchMock.object,
            queueMock.object,
            batchConfig,
            serviceConfigMock.object,
            loggerMock.object,
            systemMock.object,
        );
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        serviceConfigMock.verifyAll();
        loggerMock.verifyAll();
    });

    afterAll(() => {
        mockDate.reset();
    });

    it('throw if not initialized', async () => {
        batchMock.reset();
        serviceConfigMock.reset();
        await expect(testSubject.run()).rejects.toEqual(new Error('The BatchTaskCreator instance is not initialized.'));
    });

    it('exit when no queue messages', async () => {
        await testSubject.init();
        loggerMock
            .setup((o) => o.logInfo(`All tasks are completed and no new scan requests available. Exiting the job manager.`))
            .verifiable();

        testSubject.getJobPendingTasksCountCallback = jest.fn().mockImplementation(async () => Promise.resolve(0));
        testSubject.validateTasksCallback = jest.fn();
        testSubject.waitForChildTasksCallback = jest.fn();
        testSubject.onExitCallback = jest.fn();

        await testSubject.run();

        expect(testSubject.getJobPendingTasksCountCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.validateTasksCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.waitForChildTasksCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.onExitCallback).toHaveBeenCalledTimes(1);
    });

    it('run in a loop while no queue message', async () => {
        await testSubject.init();
        loggerMock
            .setup((o) => o.logInfo(`All tasks are completed and no new scan requests available. Exiting the job manager.`))
            .verifiable();

        const queueMessagesGenerator = new QueueMessagesGenerator();

        testSubject.getMessagesForTaskCreationCallback = queueMessagesGenerator.queueMessagesGeneratorFn();
        testSubject.addTasksToJobCallback = jest.fn().mockImplementation(() => {
            return queueMessagesGenerator.jobTaskGeneratorFn()();
        });
        testSubject.getJobPendingTasksCountCallback = jest.fn().mockImplementation(async () => Promise.resolve(0));
        testSubject.onTasksAddedCallback = jest.fn();
        testSubject.validateTasksCallback = jest.fn();
        testSubject.waitForChildTasksCallback = jest.fn();
        testSubject.onExitCallback = jest.fn();

        await testSubject.run();

        expect(queueMessagesGenerator.runCount).toEqual(queueMessagesGenerator.maxRunCount);
        expect(testSubject.activeScanMessages).toEqual(queueMessagesGenerator.scanMessages);
        for (let i = 0; i < queueMessagesGenerator.scanMessagesByRun.length; i += 1) {
            expect(testSubject.addTasksToJobCallback).nthCalledWith(i + 1, queueMessagesGenerator.scanMessagesByRun[i]);
        }
        for (let i = 0; i < queueMessagesGenerator.jobTasksByRun.length; i += 1) {
            expect(testSubject.onTasksAddedCallback).nthCalledWith(i + 1, queueMessagesGenerator.jobTasksByRun[i]);
        }
        expect(testSubject.getJobPendingTasksCountCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.validateTasksCallback).toHaveBeenCalledTimes(queueMessagesGenerator.runCount + 1);
        expect(testSubject.waitForChildTasksCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.onExitCallback).toHaveBeenCalledTimes(1);
    });

    it('exit manager after scheduled period', async () => {
        jobManagerConfig = {
            maxWallClockTimeInHours: -1,
        } as JobManagerConfig;
        serviceConfigMock.reset();
        serviceConfigMock.setup((o) => o.getConfigValue('jobManagerConfig')).returns(async () => Promise.resolve(jobManagerConfig));

        await testSubject.init();

        loggerMock
            .setup((o) =>
                o.logInfo(`Performing scheduled job manager termination after ${jobManagerConfig.maxWallClockTimeInHours} hours.`),
            )
            .verifiable();

        const queueMessagesGenerator = new QueueMessagesGenerator();

        testSubject.getMessagesForTaskCreationCallback = queueMessagesGenerator.queueMessagesGeneratorFn();
        testSubject.addTasksToJobCallback = jest.fn().mockImplementation(() => {
            return queueMessagesGenerator.jobTaskGeneratorFn()();
        });
        testSubject.onTasksAddedCallback = jest.fn();
        testSubject.validateTasksCallback = jest.fn();
        testSubject.waitForChildTasksCallback = jest.fn();
        testSubject.onExitCallback = jest.fn();

        await testSubject.run();

        expect(queueMessagesGenerator.runCount).toEqual(1);
        expect(testSubject.activeScanMessages).toEqual(queueMessagesGenerator.scanMessages);
        for (let i = 0; i < queueMessagesGenerator.scanMessagesByRun.length; i += 1) {
            expect(testSubject.addTasksToJobCallback).nthCalledWith(i + 1, queueMessagesGenerator.scanMessagesByRun[i]);
        }
        for (let i = 0; i < queueMessagesGenerator.jobTasksByRun.length; i += 1) {
            expect(testSubject.onTasksAddedCallback).nthCalledWith(i + 1, queueMessagesGenerator.jobTasksByRun[i]);
        }
        expect(testSubject.validateTasksCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.waitForChildTasksCallback).toHaveBeenCalledTimes(1);
        expect(testSubject.onExitCallback).toHaveBeenCalledTimes(1);
    });

    it('wait for pending tasks to complete', async () => {
        const pendingTaskCount = 10;
        loggerMock.setup((o) => o.logInfo(`Waiting for job tasks to complete.`)).verifiable();
        loggerMock.setup((o) => o.logInfo(`All job tasks are completed.`)).verifiable();
        loggerMock.setup((o) => o.logInfo(`Pending job tasks: ${pendingTaskCount}.`)).verifiable();

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.waitForChildTasks;
        testSubject.getJobPendingTasksCountCallback = jest.fn().mockResolvedValueOnce(pendingTaskCount);

        await testSubject.waitForChildTasks();
    });

    it('get pending tasks count', async () => {
        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 7,
                runningTasks: 3,
            },
        };
        batchMock.reset();
        batchMock.setup((o) => o.getPoolMetricsInfo()).returns(async () => Promise.resolve(poolMetricsInfo));

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.getJobPendingTasksCount;

        const pendingTaskCount = await testSubject.getJobPendingTasksCount();

        expect(pendingTaskCount).toEqual(9);
    });

    it('add tasks to job', async () => {
        await testSubject.init();

        const queueMessagesGenerator = new QueueMessagesGenerator();
        queueMessagesGenerator.queueMessagesGeneratorFn()();
        queueMessagesGenerator.jobTaskGeneratorFn()();

        queueMessagesGenerator.jobTasks.map((jobTask) => {
            const scanMessage = queueMessagesGenerator.scanMessages.find((m) => m.messageId === jobTask.correlationId);
            if (jobTask.state === JobTaskState.queued) {
                loggerMock
                    .setup((o) =>
                        o.logInfo(
                            `The scan task created successfully.`,
                            It.isValue({ scanId: scanMessage.scanId, scanTaskId: jobTask.id }),
                        ),
                    )
                    .verifiable();
            } else {
                loggerMock
                    .setup((o) =>
                        o.logError(
                            `Failure to create scan task.`,
                            It.isValue({
                                scanId: scanMessage.scanId,
                                scanTaskId: jobTask.id,
                                scanTaskError: jobTask.error,
                                scanTaskState: jobTask.state,
                            }),
                        ),
                    )
                    .verifiable();
            }
        });

        batchMock
            .setup((o) =>
                o.createTasks(
                    batchConfig.jobId,
                    queueMessagesGenerator.scanMessages.map((m: ScanMessage) => m.message),
                ),
            )
            .returns(async () => Promise.resolve(queueMessagesGenerator.jobTasks))
            .verifiable();

        testSubject.activeScanMessages = queueMessagesGenerator.scanMessages;
        testSubject.enableBaseWorkflow = EnableBaseWorkflow.addTasksToJob;

        const expectedJobTasks = queueMessagesGenerator.jobTasks.filter((jobTask) => jobTask.state === JobTaskState.queued);

        const actualJobTasks = await testSubject.addTasksToJob(queueMessagesGenerator.scanMessages);

        expect(actualJobTasks).toEqual(expectedJobTasks);
    });

    it('get queue config', async () => {
        const queueRuntimeConfig = {
            maxQueueSize: 10,
            messageVisibilityTimeoutInSeconds: 30,
            maxDequeueCount: 2,
        } as QueueRuntimeConfig;
        serviceConfigMock
            .setup((o) => o.getConfigValue('queueConfig'))
            .returns(async () => Promise.resolve(queueRuntimeConfig))
            .verifiable();

        const actualQueueConfig = await testSubject.getQueueConfig();

        expect(actualQueueConfig).toEqual(queueRuntimeConfig);
    });

    it('validate tasks', async () => {
        const queueMessagesGenerator = new QueueMessagesGenerator();
        queueMessagesGenerator.queueMessagesGeneratorFn()();
        queueMessagesGenerator.jobTaskGeneratorFn()();

        testSubject.activeScanMessages = queueMessagesGenerator.scanMessages;
        testSubject.deleteScanQueueMessagesForSucceededTasksCallback = jest.fn();
        testSubject.handleFailedTasksCallback = jest.fn();

        const batchTasks = queueMessagesGenerator.jobTasks
            .filter((task: JobTask) => task.state === JobTaskState.failed)
            .map((task) => {
                return {
                    id: task.id,
                    correlationId: getTaskCorrelationId(task.id),
                } as BatchTask;
            });
        batchMock
            .setup((o) => o.getFailedTasks(batchConfig.jobId))
            .returns(async () => Promise.resolve(batchTasks))
            .verifiable(Times.exactly(2));

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.validateTasks;

        await testSubject.validateTasks();

        expect(testSubject.deleteScanQueueMessagesForSucceededTasksCallback).toHaveBeenCalledWith(queueMessagesGenerator.scanMessages);
        expect(testSubject.handleFailedTasksCallback).toHaveBeenCalledWith(batchTasks);

        // the subsequent run should be no-op since active messages cache was cleaned up
        await testSubject.validateTasks();
    });

    it('delete queue messages for succeeded tasks', async () => {
        const queueMessagesGenerator = new QueueMessagesGenerator();
        queueMessagesGenerator.queueMessagesGeneratorFn()();
        queueMessagesGenerator.jobTaskGeneratorFn()();

        const batchTasks = queueMessagesGenerator.jobTasks
            .filter((task: JobTask) => task.state === JobTaskState.completed)
            .map((task) => {
                return {
                    id: task.id,
                    correlationId: getTaskCorrelationId(task.id),
                } as BatchTask;
            });
        batchMock
            .setup((o) => o.getSucceededTasks(batchConfig.jobId))
            .returns(async () => Promise.resolve(batchTasks))
            .verifiable(Times.exactly(2));

        const expectScanMessages = _.cloneDeep(queueMessagesGenerator.scanMessages);
        batchTasks.map((task) => {
            const scanMessage = queueMessagesGenerator.scanMessages.find((m) => m.messageId === task.correlationId);
            expectScanMessages.splice(expectScanMessages.indexOf(scanMessage), 1);
            queueMock.setup((o) => o.deleteMessage(testSubject.getQueueName(), scanMessage.message)).verifiable();
            loggerMock
                .setup((o) =>
                    o.logInfo(
                        `The scan request deleted from the scan task queue.`,
                        It.isValue({ scanId: scanMessage.scanId, correlatedBatchTaskId: task.id }),
                    ),
                )
                .verifiable();
        });

        testSubject.enableBaseWorkflow = EnableBaseWorkflow.deleteScanQueueMessagesForSucceededTasks;
        testSubject.activeScanMessages = queueMessagesGenerator.scanMessages;

        await testSubject.deleteScanQueueMessagesForSucceededTasks(queueMessagesGenerator.scanMessages);

        expect(testSubject.activeScanMessages).toEqual(expectScanMessages);

        // the subsequent run should be no-op since active messages cache was cleaned up
        await testSubject.deleteScanQueueMessagesForSucceededTasks(queueMessagesGenerator.scanMessages);
    });
});

function createJobTasks(messages: ScanMessage[]): JobTask[] {
    const stateGeneratorFn = (seed: number): JobTaskState => {
        if (seed === 2) {
            return JobTaskState.failed;
        } else if (seed === 3) {
            return JobTaskState.completed;
        }

        return JobTaskState.queued;
    };

    let count = 0;

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
