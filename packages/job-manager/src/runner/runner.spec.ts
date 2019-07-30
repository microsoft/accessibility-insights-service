// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Message, Queue } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { Batch } from '../batch/batch';
import { JobTask, JobTaskState } from '../batch/job-task';
import { PoolMetrics, PoolMetricsState } from '../batch/pool-metrics';
import { Runner } from './runner';

// tslint:disable: no-unsafe-any

let runner: Runner;
let batchMock: IMock<Batch>;
let queueMock: IMock<Queue>;
let poolMetricsMock: IMock<PoolMetrics>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
const targetQueuedTasksOverloadRatioDefault = 2;
const tasksIncrementIntervalInSecondsDefault = 1;

describe(Runner, () => {
    beforeEach(() => {
        process.env.AZ_BATCH_JOB_ID = 'batch-job-id';
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        poolMetricsMock = Mock.ofType(PoolMetrics);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(Logger);

        queueMock.setup(o => o.scanQueue).returns(() => 'scan-queue');

        serviceConfigMock
            .setup(async s => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    targetQueuedTasksOverloadRatio: targetQueuedTasksOverloadRatioDefault,
                    tasksIncrementIntervalInSeconds: tasksIncrementIntervalInSecondsDefault,
                    periodicRestartInHours: 1,
                };
            })
            .verifiable(Times.atLeastOnce());

        batchMock
            .setup(async o => o.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true))
            .returns(async () => Promise.resolve(process.env.AZ_BATCH_JOB_ID))
            .verifiable(Times.once());

        runner = new Runner(batchMock.object, queueMock.object, poolMetricsMock.object, serviceConfigMock.object, loggerMock.object);
        runner.runOnce = true;
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
                pendingTasks: 8,
            },
        };
        poolMetricsMock
            .setup(o => o.getTasksIncrementCount(poolMetricsInfo, targetQueuedTasksOverloadRatioDefault))
            .returns(() => 8)
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

        await runner.run();

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
                pendingTasks: 8,
            },
        };
        poolMetricsMock
            .setup(o => o.getTasksIncrementCount(poolMetricsInfo, targetQueuedTasksOverloadRatioDefault))
            .returns(() => 0)
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

        await runner.run();
    });

    it('skip adding tasks when message queue is empty', async () => {
        const poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
                pendingTasks: 8,
            },
        };
        poolMetricsMock
            .setup(o => o.getTasksIncrementCount(poolMetricsInfo, targetQueuedTasksOverloadRatioDefault))
            .returns(() => 8)
            .verifiable(Times.once());
        poolMetricsMock.setup(o => o.poolState).returns(() => <PoolMetricsState>(<unknown>{ lastTasksIncrementCount: 2 }));

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

        await runner.run();
    });
});
