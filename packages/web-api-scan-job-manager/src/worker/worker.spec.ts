// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import {
    Batch,
    BatchConfig,
    BatchTask,
    BatchTaskFailureInfo,
    JobTask,
    Message,
    PoolLoadGenerator,
    PoolLoadSnapshot,
    PoolMetricsInfo,
    Queue,
    StorageConfig,
} from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration, System } from 'common';
import { isEqual, isNil } from 'lodash';
import * as moment from 'moment';
import { BatchPoolLoadSnapshotProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { OnDemandPageScanResult, StorageDocument } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ScanMessage, TaskArguments, Worker } from './worker';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion no-any mocha-no-side-effect-code no-null-keyword

class TestableWorker extends Worker {
    public setScanMessages(scanMessages: ScanMessage[]): void {
        super.scanMessages = scanMessages;
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async onTasksAdded(tasks: JobTask[]): Promise<void> {
        return super.onTasksAdded(tasks);
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async onExit(): Promise<void> {
        return super.onExit();
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async getMessagesForTaskCreation(): Promise<Message[]> {
        return super.getMessagesForTaskCreation();
    }

    // tslint:disable-next-line: no-unnecessary-override
    public async onTasksValidation(): Promise<void> {
        return super.onTasksValidation();
    }
}

const messageVisibilityTimeout = 10;
const dateNowIso = '2019-12-12T12:00:00.000Z';
const dateNow = new Date(dateNowIso);

moment.prototype.toDate = () => dateNow;
moment.prototype.add = (amount?: number, unit?: moment.DurationInputArg2) => {
    if (unit !== 'second') {
        throw new Error(`Unit '${unit}' is not implemented by test mock.`);
    }

    return moment(new Date(dateNow.valueOf() + amount * 1000));
};
moment.prototype.utc = (inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, language?: string, strict?: boolean) =>
    moment(dateNow);

describe(Worker, () => {
    let worker: TestableWorker;
    let batchMock: IMock<Batch>;
    let queueMock: IMock<Queue>;
    let poolLoadGeneratorMock: IMock<PoolLoadGenerator>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let batchPoolLoadSnapshotProviderMock: IMock<BatchPoolLoadSnapshotProvider>;
    let onDemandPageScanRunResultProviderMock: IMock<OnDemandPageScanRunResultProvider>;
    let systemMock: IMock<typeof System>;
    let storageConfigStub: StorageConfig;

    const batchConfig: BatchConfig = {
        accountName: 'batch-account-name',
        accountUrl: '',
        poolId: 'pool-Id',
        jobId: 'batch-job-id',
    };

    beforeEach(() => {
        batchMock = Mock.ofType(Batch, MockBehavior.Strict);
        queueMock = Mock.ofType(Queue, MockBehavior.Strict);
        poolLoadGeneratorMock = Mock.ofType(PoolLoadGenerator, MockBehavior.Strict);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (o) => o.getConfigValue('queueConfig'))
            .returns(async () =>
                Promise.resolve(<QueueRuntimeConfig>(<unknown>{ messageVisibilityTimeoutInSeconds: messageVisibilityTimeout })),
            );
        loggerMock = Mock.ofType(MockableLogger);
        batchPoolLoadSnapshotProviderMock = Mock.ofType(BatchPoolLoadSnapshotProvider, MockBehavior.Strict);
        onDemandPageScanRunResultProviderMock = Mock.ofType(OnDemandPageScanRunResultProvider, MockBehavior.Strict);
        systemMock = Mock.ofInstance(System, MockBehavior.Strict);
        storageConfigStub = {
            scanQueue: 'scan-queue',
        } as StorageConfig;

        worker = new TestableWorker(
            batchMock.object,
            queueMock.object,
            poolLoadGeneratorMock.object,
            batchPoolLoadSnapshotProviderMock.object,
            onDemandPageScanRunResultProviderMock.object,
            batchConfig,
            serviceConfigMock.object,
            storageConfigStub,
            loggerMock.object,
            systemMock.object,
        );
    });

    function setupSystemChunkArrayMock(arrayLength: number): void {
        systemMock
            .setup((s) =>
                s.chunkArray(
                    It.is((array) => array.length === arrayLength),
                    100,
                ),
            )
            .returns((array: any[]) => {
                const chunks = [];
                chunks.push(array);

                return chunks;
            })
            .verifiable(Times.once());
    }

    describe('onTasksAdded', () => {
        it('sets pool load generator last increment count', async () => {
            const tasks: any[] = ['task1', 'task2'];

            poolLoadGeneratorMock.setup((p) => p.setLastTasksIncrementCount(2)).verifiable(Times.once());

            await worker.onTasksAdded(tasks);
        });
    });

    function setVerifiableFailedTasksCall(tasks: BatchTask[]): void {
        batchMock
            .setup(async (b) => b.getFailedTasks(batchConfig.jobId))
            .returns(async () => Promise.resolve(tasks))
            .verifiable(Times.once());
    }

    function setupVerifiableReadScanRunCall(scanId: string, document: OnDemandPageScanResult): void {
        onDemandPageScanRunResultProviderMock
            .setup(async (s) => s.readScanRun(scanId))
            .returns(async () => Promise.resolve(document))
            .verifiable(Times.once());
    }

    function setupVerifiableUpdateScanRunCall(
        document: OnDemandPageScanResult,
        callback?: (toUpdateDoc: OnDemandPageScanResult) => void,
    ): void {
        onDemandPageScanRunResultProviderMock
            .setup(async (s) => s.updateScanRun(It.is((doc) => doc.id === document.id)))
            .callback((toUpdateDoc) => {
                if (!isNil(callback)) {
                    callback(toUpdateDoc);
                }
            })
            .returns(async () => Promise.resolve(document))
            .verifiable(Times.once());
    }

    describe('onExit', () => {
        test.each([
            {
                jobTasks: undefined,
            },
            {
                jobTasks: [],
            },
        ])('does nothing if there are no failed tasks', async (testCase) => {
            setVerifiableFailedTasksCall(testCase.jobTasks);

            await worker.onExit();
        });

        test.each([
            {
                taskArguments: null,
            },
            {
                taskArguments: {
                    id: null,
                },
            },
            {
                taskArguments: {
                    id: undefined,
                },
            },
        ])('logs error if unable to get required task arguments - %j', async (testCase) => {
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(testCase.taskArguments),
                } as BatchTask,
            ];

            setVerifiableFailedTasksCall(failedTasks);

            loggerMock
                .setup((l) =>
                    l.logError(
                        'Unable to update failed scan run result. Task has no scan id run arguments defined.',
                        It.isValue({
                            batchTaskId: failedTasks[0].id,
                            taskProperties: JSON.stringify(failedTasks[0]),
                        }),
                    ),
                )
                .verifiable(Times.once());

            await worker.onExit();
        });

        it('logs error if page scan result document not found', async () => {
            const taskArgs: TaskArguments = {
                id: 'task id1',
            };
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(taskArgs),
                } as BatchTask,
            ];

            setupVerifiableReadScanRunCall(taskArgs.id, undefined);
            setVerifiableFailedTasksCall(failedTasks);

            loggerMock
                .setup((l) =>
                    l.logError(
                        'Task has no corresponding state in a result storage.',
                        It.isValue({
                            batchTaskId: failedTasks[0].id,
                            taskProperties: JSON.stringify(failedTasks[0]),
                        }),
                    ),
                )
                .verifiable(Times.once());

            await worker.onExit();
        });

        it('does nothing if scan document is already set to failed', async () => {
            const taskArgs: TaskArguments = {
                id: 'task id1',
            };
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(taskArgs),
                } as BatchTask,
            ];
            const document = {
                id: taskArgs.id,
                run: {
                    state: 'failed',
                },
            } as OnDemandPageScanResult;

            setupVerifiableReadScanRunCall(taskArgs.id, document);
            setVerifiableFailedTasksCall(failedTasks);

            await worker.onExit();
        });

        test.each([
            {
                failureInfo: undefined,
            },
            {
                failureInfo: {
                    category: 'serverError',
                    code: '3456',
                    message: 'some server error occurred',
                } as BatchTaskFailureInfo,
            },
        ])('complete failed tasks - %j', async (testCase) => {
            const taskArgs: TaskArguments = {
                id: 'task id1',
            };
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(taskArgs),
                    exitCode: 123,
                    timestamp: new Date('2020-01-01T12:00:00.000Z'),
                    failureInfo: testCase.failureInfo,
                } as BatchTask,
            ];
            const document = {
                id: taskArgs.id,
                run: {
                    state: 'running',
                },
            } as OnDemandPageScanResult;

            let expectedUpdatedDocument: OnDemandPageScanResult;

            setupVerifiableReadScanRunCall(taskArgs.id, document);
            setupVerifiableUpdateScanRunCall(document, (actualDocument) => {
                expectedUpdatedDocument = actualDocument;
            });

            setVerifiableFailedTasksCall(failedTasks);

            await worker.onExit();

            expect(expectedUpdatedDocument).toMatchSnapshot();
        });

        it('handles multiple failed tasks', async () => {
            const taskArgs1: TaskArguments = {
                id: 'task id1',
            };
            const taskArgs2: TaskArguments = {
                id: 'task id2',
            };
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(taskArgs1),
                    exitCode: 123,
                    timestamp: new Date('2020-01-01T12:00:00.000Z'),
                } as BatchTask,
                {
                    taskArguments: JSON.stringify(taskArgs2),
                    exitCode: 456,
                    timestamp: new Date('2020-01-02T12:00:00.000Z'),
                } as BatchTask,
            ];
            const pageDocument1 = {
                id: taskArgs1.id,
                run: {
                    state: 'running',
                },
            } as OnDemandPageScanResult;

            const pageDocument2 = {
                id: taskArgs2.id,
                run: {
                    state: 'queued',
                },
            } as OnDemandPageScanResult;

            let expectedUpdatedDocument1: OnDemandPageScanResult;
            let expectedUpdatedDocument2: OnDemandPageScanResult;

            setupVerifiableReadScanRunCall(taskArgs1.id, pageDocument1);
            setupVerifiableReadScanRunCall(taskArgs2.id, pageDocument2);

            setupVerifiableUpdateScanRunCall(pageDocument1, (actualDocument) => {
                expectedUpdatedDocument1 = actualDocument;
            });
            setupVerifiableUpdateScanRunCall(pageDocument2, (actualDocument) => {
                expectedUpdatedDocument2 = actualDocument;
            });

            setVerifiableFailedTasksCall(failedTasks);

            await worker.onExit();

            expect(expectedUpdatedDocument1).toMatchSnapshot();
            expect(expectedUpdatedDocument2).toMatchSnapshot();
        });
    });

    describe('getMessagesForTaskCreation', () => {
        let poolMetricsInfo: PoolMetricsInfo;
        let poolLoadSnapshot: PoolLoadSnapshot;

        beforeEach(() => {
            poolMetricsInfo = {
                id: 'pool-id',
                maxTasksPerPool: 4,
                load: {
                    activeTasks: 4,
                    runningTasks: 4,
                },
            };

            poolLoadSnapshot = {
                tasksIncrementCountPerInterval: 60,
                targetActiveToRunningTasksRatio: 2,
                configuredMaxTasksPerPool: poolMetricsInfo.maxTasksPerPool,
                poolId: poolMetricsInfo.id,
                samplingIntervalInSeconds: 5,
                tasksProcessingSpeedPerInterval: 7,
                tasksProcessingSpeedPerMinute: 13,
                timestamp: dateNow,
                ...poolMetricsInfo.load,
            };

            batchMock
                .setup(async (o) => o.getPoolMetricsInfo())
                .returns(async () => Promise.resolve(poolMetricsInfo))
                .verifiable(Times.once());

            poolLoadGeneratorMock
                .setup(async (p) => p.getPoolLoadSnapshot(poolMetricsInfo))
                .returns(async () => Promise.resolve(poolLoadSnapshot))
                .verifiable(Times.once());

            setupBatchPoolLoadSnapshotProviderMock();
        });

        it('delete queue messages on tasks validation', async () => {
            worker.setScanMessages([
                {
                    scanId: 'id',
                    queueMessage: undefined,
                },
            ]);

            poolLoadGeneratorMock.reset();
            batchPoolLoadSnapshotProviderMock.reset();
            batchMock.reset();
            batchMock
                .setup((o) => o.getSucceededTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());
            batchMock
                .setup((o) => o.getFailedTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());

            await worker.onTasksValidation();
        });

        it('delete queue messages on exit', async () => {
            worker.setScanMessages([
                {
                    scanId: 'id',
                    queueMessage: undefined,
                },
            ]);

            poolLoadGeneratorMock.reset();
            batchPoolLoadSnapshotProviderMock.reset();
            batchMock.reset();
            batchMock
                .setup((o) => o.getSucceededTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());
            batchMock
                .setup((o) => o.getFailedTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());

            await worker.onExit();
        });

        it('skip delete queue messages when no succeeded tasks', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 10;
            const messageCount = 4;
            const queueMessages: Message[] = [];
            for (let i = 0; i < messageCount; i = i + 1) {
                queueMessages.push({
                    messageId: `id-${i}`,
                    messageText: JSON.stringify({ id: `id-${i}` }),
                });
            }
            setupVerifiableGetQueueMessagesCall(queueMessages);

            const scanDocuments: OnDemandPageScanResult[] = [];
            for (const queueMessage of queueMessages) {
                scanDocuments.push({
                    id: queueMessage.messageId,
                    run: {
                        state: 'queued',
                    },
                } as OnDemandPageScanResult);
            }
            onDemandPageScanRunResultProviderMock
                .setup(async (s) => s.readScanRuns(queueMessages.map((m) => m.messageId)))
                .returns(async () => Promise.resolve(scanDocuments))
                .verifiable(Times.once());

            setupSystemChunkArrayMock(queueMessages.length);

            const succeededTasks: BatchTask[] = [];
            batchMock
                .setup((o) => o.getSucceededTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve(succeededTasks))
                .verifiable(Times.once());
            batchMock
                .setup((o) => o.getFailedTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());

            await worker.getMessagesForTaskCreation();
            await worker.onExit();
        });

        it('delete queue messages when scan task succeeded', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 10;
            const messageCount = 4;
            const queueMessages: Message[] = [];
            for (let i = 0; i < messageCount; i = i + 1) {
                queueMessages.push({
                    messageId: `id-${i}`,
                    messageText: JSON.stringify({ id: `id-${i}` }),
                });
            }
            setupVerifiableGetQueueMessagesCall(queueMessages);

            const scanDocuments: OnDemandPageScanResult[] = [];
            for (const queueMessage of queueMessages) {
                scanDocuments.push({
                    id: queueMessage.messageId,
                    run: {
                        state: 'queued',
                    },
                } as OnDemandPageScanResult);
            }
            onDemandPageScanRunResultProviderMock
                .setup(async (s) => s.readScanRuns(queueMessages.map((m) => m.messageId)))
                .returns(async () => Promise.resolve(scanDocuments))
                .verifiable(Times.once());

            setupSystemChunkArrayMock(queueMessages.length);

            const succeededTasks: BatchTask[] = [];
            for (let i = 0; i < messageCount; i = i + 1) {
                const taskArgs: TaskArguments = {
                    id: `id-${i}`,
                };
                if (i + 1 === messageCount) {
                    // set last task without task parameters
                    succeededTasks.push({
                        id: '12',
                        taskArguments: JSON.stringify({}),
                    } as BatchTask);
                } else {
                    succeededTasks.push({
                        taskArguments: JSON.stringify(taskArgs),
                    } as BatchTask);
                }
            }
            batchMock
                .setup((o) => o.getSucceededTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve(succeededTasks))
                .verifiable(Times.once());
            batchMock
                .setup((o) => o.getFailedTasks(batchConfig.jobId))
                .returns(async () => Promise.resolve([]))
                .verifiable(Times.once());

            queueMessages.slice(0, messageCount - 1).map((m) => {
                setupVerifiableDeleteQueueMessageCall(m);
            });

            loggerMock
                .setup((o) =>
                    o.logError(
                        'Unable to delete scan queue message. Task has no scan id run arguments defined.',
                        It.isValue({
                            batchTaskId: succeededTasks[messageCount - 1].id,
                            taskProperties: JSON.stringify(succeededTasks[messageCount - 1]),
                        }),
                    ),
                )
                .verifiable(Times.once());

            await worker.getMessagesForTaskCreation();
            await worker.onExit();
        });

        it('does not get messages if already has enough pending tasks', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 0;

            const messages = await worker.getMessagesForTaskCreation();

            expect(messages).toHaveLength(0);
        });

        it('does not return messages if queue is empty', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 10;

            setupVerifiableGetQueueMessagesCall([]);
            const messages = await worker.getMessagesForTaskCreation();

            expect(messages).toHaveLength(0);
        });

        it('gets only messages that are terminated or failed', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 10;
            const queueMessages: Message[] = [];
            for (let i = 0; i < 4; i = i + 1) {
                queueMessages.push({
                    messageId: `id-${i}`,
                    messageText: JSON.stringify({ id: `id-${i}` }),
                });
            }
            setupVerifiableGetQueueMessagesCall(queueMessages);

            const scanDocuments = [
                {
                    id: queueMessages[0].messageId,
                    run: {
                        state: 'queued',
                    },
                } as OnDemandPageScanResult,
                {
                    id: queueMessages[1].messageId,
                    run: {
                        state: 'running',
                    },
                } as OnDemandPageScanResult,
                {
                    id: queueMessages[2].messageId,
                    run: {
                        state: 'failed',
                    },
                } as OnDemandPageScanResult,
                {
                    id: queueMessages[3].messageId,
                    run: {
                        state: 'completed',
                    },
                } as OnDemandPageScanResult,
            ];

            onDemandPageScanRunResultProviderMock
                .setup(async (s) => s.readScanRuns(queueMessages.map((m) => m.messageId)))
                .returns(async () => Promise.resolve(scanDocuments))
                .verifiable(Times.once());

            setupSystemChunkArrayMock(queueMessages.length);

            setupVerifiableDeleteQueueMessageCall(queueMessages[3]);

            const messages = await worker.getMessagesForTaskCreation();

            const expectedMessages = queueMessages.slice(0, 3);
            expect(messages).toEqual(expectedMessages);
        });

        function setupBatchPoolLoadSnapshotProviderMock(times: Times = Times.once()): void {
            batchPoolLoadSnapshotProviderMock
                .setup(async (o) =>
                    o.writeBatchPoolLoadSnapshot(
                        It.is((d) => {
                            const document = {
                                // tslint:disable-next-line: no-object-literal-type-assertion
                                ...({} as StorageDocument),
                                batchAccountName: batchConfig.accountName,
                                ...poolLoadSnapshot,
                            };

                            return isEqual(document, d);
                        }),
                    ),
                )
                .verifiable(times);
        }

        function setupVerifiableGetQueueMessagesCall(messages: Message[]): void {
            queueMock
                .setup((q) => q.getMessagesWithTotalCount(storageConfigStub.scanQueue, poolLoadSnapshot.tasksIncrementCountPerInterval))
                .returns(async () => Promise.resolve(messages))
                .verifiable(Times.once());
        }
    });

    function setupVerifiableDeleteQueueMessageCall(message: Message): void {
        queueMock
            .setup((q) => q.deleteMessage(storageConfigStub.scanQueue, It.isValue(message)))
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());
    }

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        poolLoadGeneratorMock.verifyAll();
        serviceConfigMock.verifyAll();
        loggerMock.verifyAll();
        batchPoolLoadSnapshotProviderMock.verifyAll();
        onDemandPageScanRunResultProviderMock.verifyAll();
        systemMock.verifyAll();
    });
});
