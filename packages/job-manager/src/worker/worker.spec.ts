// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Message, Queue } from 'azure-services';
import { ServiceConfiguration } from 'common';
import * as _ from 'lodash';
import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { Batch } from '../batch/batch';
import { JobTask, JobTaskState } from '../batch/job-task';
import { PoolLoadGenerator } from '../batch/pool-load-generator';
import { Worker } from './worker';

// tslint:disable: no-unsafe-any

let worker: Worker;
let batchMock: IMock<Batch>;
let queueMock: IMock<Queue>;
let poolLoadGeneratorMock: IMock<PoolLoadGenerator>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
const activeToRunningTasksRatioDefault = 2;
const addTasksIntervalInSecondsDefault = 1;

describe(Worker, () => {
    beforeEach(() => {
        process.env.AZ_BATCH_JOB_ID = 'batch-job-id';
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        poolLoadGeneratorMock = Mock.ofType(PoolLoadGenerator);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(Logger);

        queueMock.setup(o => o.scanQueue).returns(() => 'scan-queue');

        serviceConfigMock
            .setup(async s => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    activeToRunningTasksRatio: activeToRunningTasksRatioDefault,
                    addTasksIntervalInSeconds: addTasksIntervalInSecondsDefault,
                    maxWallClockTimeInHours: 1,
                };
            })
            .verifiable(Times.atLeastOnce());

        poolLoadGeneratorMock.object.activeToRunningTasksRatio = 1;
        poolLoadGeneratorMock.setup(o => o.processingSpeedPerMinute).returns(() => 1);

        batchMock
            .setup(async o => o.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true))
            .returns(async () => Promise.resolve(process.env.AZ_BATCH_JOB_ID))
            .verifiable(Times.once());

        worker = new Worker(batchMock.object, queueMock.object, poolLoadGeneratorMock.object, serviceConfigMock.object, loggerMock.object);
        worker.runOnce = true;
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('add tasks to the job', async () => {
        const taskCount = 2;
        const queueMessages: Message[] = [];
        const jobTasks: JobTask[] = [];
        let scanMessagesCount = 0;

        for (let i = 1; i <= taskCount; i += 1) {
            const message = {
                messageText: '{}',
                messageId: `message-id-${i}`,
            };
            queueMessages.push(message);

            const jobTask = new JobTask();
            jobTask.state = JobTaskState.queued;
            jobTask.correlationId = message.messageId;
            jobTasks.push(jobTask);
        }

        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.once());

        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, queueMessages))
            .returns(async () => Promise.resolve(jobTasks))
            .verifiable(Times.once());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .callback(q => {
                scanMessagesCount += 1;
            })
            .returns(async () => {
                return queueMessages.length >= scanMessagesCount
                    ? Promise.resolve([queueMessages[scanMessagesCount - 1]])
                    : Promise.resolve([]);
            })
            .verifiable(Times.exactly(taskCount + 1));
        queueMock
            .setup(async o => o.deleteMessage(It.isAny()))
            .callback(message => {
                const i = queueMessages.indexOf(queueMessages.find(m => m.messageId === message.messageId));
                queueMessages.splice(i, 1);
            })
            .verifiable(Times.exactly(taskCount));

        await worker.run();

        // should delete messages from the queue
        expect(queueMessages.length).toEqual(0);
    });

    it('skip adding tasks when pool is overloaded', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(0))
            .verifiable(Times.once());

        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        queueMock.setup(async o => o.deleteMessage(It.isAny())).verifiable(Times.never());

        await worker.run();
    });

    it('skip adding tasks when message queue is empty', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.once());

        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.once());
        queueMock.setup(async o => o.deleteMessage(It.isAny())).verifiable(Times.never());

        await worker.run();
    });
    it('Continue waiting until all active and running tasks are completed', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
            },
        };
        let poolMetricsInfoCallbackCount = 0;
        poolLoadGeneratorMock
            .setup(async o =>
                o.getTasksIncrementCount(
                    It.is(actualMetrics => {
                        return _.isEqual(poolMetricsInfo, actualMetrics);
                    }),
                ),
            )
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.exactly(2));
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .callback(q => {
                poolMetricsInfoCallbackCount += 1;
            })
            .returns(async () => {
                if (poolMetricsInfoCallbackCount > 1) {
                    poolMetricsInfo.load.activeTasks = 0;
                    poolMetricsInfo.load.runningTasks = 1;

                    return Promise.resolve(poolMetricsInfo);
                } else {
                    return Promise.resolve(poolMetricsInfo);
                }
            })
            .verifiable(Times.exactly(2));

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.exactly(2));
        // let it exit by itself
        worker.runOnce = false;
        await worker.run();
    });
    it('terminate only if there are no active task and only manager task is running', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 0,
                runningTasks: 1,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.once());
        poolLoadGeneratorMock.setup(async o => o.setLastTasksIncrementCount(It.isAny())).verifiable(Times.never());
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.once());
        await worker.run();
    });

    it('continue executing if there are active tasks', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 1,
                runningTasks: 1,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.once());
        poolLoadGeneratorMock.setup(async o => o.setLastTasksIncrementCount(It.isAny())).verifiable(Times.once());
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.once());
        await worker.run();
    });

    it('continue executing if there are running tasks', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 0,
                runningTasks: 2,
            },
        };
        poolLoadGeneratorMock
            .setup(async o => o.getTasksIncrementCount(poolMetricsInfo))
            .returns(async () => Promise.resolve(8))
            .verifiable(Times.once());
        poolLoadGeneratorMock.setup(async o => o.setLastTasksIncrementCount(It.isAny())).verifiable(Times.once());
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, It.isAny()))
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());
        batchMock
            .setup(async o => o.getPoolMetricsInfo())
            .returns(async () => Promise.resolve(poolMetricsInfo))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.once());
        await worker.run();
    });
});
