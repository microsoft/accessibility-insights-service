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
import { ServiceConfiguration, System } from 'common';
import { isEqual, isNil } from 'lodash';
import * as moment from 'moment';
import { BatchPoolLoadSnapshotProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { OnDemandPageScanResult, StorageDocument } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { TaskArguments, Worker } from './worker';

// tslint:disable: no-unsafe-any no-object-literal-type-assertion no-any mocha-no-side-effect-code no-null-keyword

const unMockedMoment = jest.requireActual('moment') as typeof moment;
let currentTime: string;

jest.mock('moment', () => {
    return () => {
        return {
            subtract: (amount: moment.DurationInputArg1, unit: moment.unitOfTime.DurationConstructor) =>
                unMockedMoment(currentTime).subtract(amount, unit),
            add: (amount: moment.DurationInputArg1, unit: moment.unitOfTime.DurationConstructor) =>
                unMockedMoment(currentTime).add(amount, unit),
            toDate: () => unMockedMoment(currentTime).toDate(),
        } as moment.Moment;
    };
});

class TestableWorker extends Worker {
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
}

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
    const dateNow = new Date('2019-12-12T12:00:00.000Z');

    beforeEach(() => {
        currentTime = '2019-01-01';
        batchMock = Mock.ofType(Batch, MockBehavior.Strict);
        queueMock = Mock.ofType(Queue, MockBehavior.Strict);
        poolLoadGeneratorMock = Mock.ofType(PoolLoadGenerator, MockBehavior.Strict);
        serviceConfigMock = Mock.ofType(ServiceConfiguration, MockBehavior.Strict);
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

    describe('onTasksAdded', () => {
        it('sets pool load generator last increment count', async () => {
            const tasks: any[] = ['task1', 'task2'];

            poolLoadGeneratorMock.setup(p => p.setLastTasksIncrementCount(2)).verifiable(Times.once());

            await worker.onTasksAdded(tasks);
        });
    });

    function setVerifiableFailedTasksCall(tasks: BatchTask[]): void {
        batchMock
            .setup(async b => b.getFailedTasks(batchConfig.jobId))
            .returns(async () => Promise.resolve(tasks))
            .verifiable(Times.once());
    }

    function setupVerifiableReadScanRunCall(scanId: string, document: OnDemandPageScanResult): void {
        onDemandPageScanRunResultProviderMock
            .setup(async s => s.readScanRun(scanId))
            .returns(async () => Promise.resolve(document))
            .verifiable(Times.once());
    }

    function setupVerifiableReadScanRunsCall(scanIds: string[], documents: OnDemandPageScanResult[]): void {
        onDemandPageScanRunResultProviderMock
            .setup(async s => s.readScanRuns(scanIds))
            .returns(async () => Promise.resolve(documents))
            .verifiable(Times.once());
    }

    function setupVerifiableUpdateScanRunCall(
        document: OnDemandPageScanResult,
        callback?: (toUpdateDoc: OnDemandPageScanResult) => void,
    ): void {
        onDemandPageScanRunResultProviderMock
            .setup(async s => s.updateScanRun(It.is(doc => doc.id === document.id)))
            .callback(toUpdateDoc => {
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
        ])('does nothing if there are no failed tasks', async testCase => {
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
        ])('logs error if unable to get required task arguments - %j', async testCase => {
            const failedTasks = [
                {
                    taskArguments: JSON.stringify(testCase.taskArguments),
                } as BatchTask,
            ];

            setVerifiableFailedTasksCall(failedTasks);

            loggerMock
                .setup(l =>
                    l.logError(
                        'Task has no run arguments defined',
                        It.isValue({
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
                .setup(l =>
                    l.logError('Task has no corresponding state in a service storage', {
                        taskProperties: JSON.stringify(failedTasks[0]),
                    }),
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
        ])('complete failed tasks - %j', async testCase => {
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
            setupVerifiableUpdateScanRunCall(document, actualDocument => {
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

            setupVerifiableUpdateScanRunCall(pageDocument1, actualDocument => {
                expectedUpdatedDocument1 = actualDocument;
            });
            setupVerifiableUpdateScanRunCall(pageDocument2, actualDocument => {
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
                .setup(async o => o.getPoolMetricsInfo())
                .returns(async () => Promise.resolve(poolMetricsInfo))
                .verifiable(Times.once());

            poolLoadGeneratorMock
                .setup(async p => p.getPoolLoadSnapshot(poolMetricsInfo))
                .returns(async () => Promise.resolve(poolLoadSnapshot))
                .verifiable(Times.once());

            setupBatchPoolLoadSnapshotProviderMock();
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

        it('gets only messages that are not scanned', async () => {
            poolLoadSnapshot.tasksIncrementCountPerInterval = 10;
            const queueMessages: Message[] = [
                {
                    messageId: 'id1',
                    messageText: JSON.stringify({ id: 'id1' }),
                },
                {
                    messageId: 'id2',
                    messageText: JSON.stringify({ id: 'id2' }),
                },
            ];

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
            ];

            setupVerifiableGetQueueMessagesCall(queueMessages);
            systemMock
                .setup(s =>
                    s.chunkArray(
                        It.is(arr => arr.length === 2),
                        100,
                    ),
                )
                .returns((arr: any[]) => {
                    const chunks = [];
                    chunks.push(arr.slice(0, 1));
                    chunks.push(arr.slice(1, 2));

                    return chunks;
                })
                .verifiable(Times.once());

            setupVerifiableReadScanRunsCall([queueMessages[0].messageId], [scanDocuments[0]]);
            setupVerifiableReadScanRunsCall([queueMessages[1].messageId], [scanDocuments[1]]);
            setupVerifiableDeleteQueueMessageCall(queueMessages[1]);

            const messages = await worker.getMessagesForTaskCreation();

            expect(messages).toHaveLength(1);
            expect(messages[0]).toBe(queueMessages[0]);
        });

        function setupBatchPoolLoadSnapshotProviderMock(times: Times = Times.once()): void {
            batchPoolLoadSnapshotProviderMock
                .setup(async o =>
                    o.writeBatchPoolLoadSnapshot(
                        It.is(d => {
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
                .setup(q => q.getMessagesWithTotalCount(storageConfigStub.scanQueue, poolLoadSnapshot.tasksIncrementCountPerInterval))
                .returns(async () => Promise.resolve(messages))
                .verifiable(Times.once());
        }
    });

    function setupVerifiableDeleteQueueMessageCall(message: Message): void {
        queueMock
            .setup(q => q.deleteMessage(storageConfigStub.scanQueue, It.isValue(message)))
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
