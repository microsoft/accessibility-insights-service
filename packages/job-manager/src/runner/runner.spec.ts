// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Message, Queue } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { Batch } from '../batch/batch';
import { JobTask, JobTaskState } from '../batch/job-task';
import { Runner } from './runner';

// tslint:disable: no-unsafe-any

let runner: Runner;
let batchMock: IMock<Batch>;
let queueMock: IMock<Queue>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let loggerMock: IMock<Logger>;
const minTaskProcessingRatioDefault = 0.1;
const maxTaskProcessingRatioDefault = 0.5;
const taskProcessingSamplingIntervalInMinutesDefault = 2;
const taskIncrementIntervalInSecondsDefault = 1;
const taskIncrementCountDefault = 1;

describe(Runner, () => {
    beforeEach(() => {
        process.env.AZ_BATCH_JOB_ID = 'batch-job-id';
        batchMock = Mock.ofType(Batch);
        queueMock = Mock.ofType(Queue);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(Logger);

        queueMock.setup(o => o.scanQueue).returns(() => 'scan-queue');

        serviceConfigMock
            .setup(async s => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    minTaskProcessingRatio: minTaskProcessingRatioDefault,
                    maxTaskProcessingRatio: maxTaskProcessingRatioDefault,
                    taskProcessingSamplingIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                    taskIncrementIntervalInSeconds: taskIncrementIntervalInSecondsDefault,
                    taskIncrementCount: taskIncrementCountDefault,
                };
            })
            .verifiable(Times.atLeastOnce());

        batchMock
            .setup(async o => o.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true))
            .returns(async () => Promise.resolve(process.env.AZ_BATCH_JOB_ID))
            .verifiable(Times.once());

        runner = new Runner(batchMock.object, queueMock.object, serviceConfigMock.object, loggerMock.object);
        runner.runOnce = true;
    });

    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('add tasks to the job when batch metrics is available', async () => {
        // running tasks vector average = 2
        const taskCount = 2 / maxTaskProcessingRatioDefault;
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

        batchMock
            .setup(async o => o.getBatchMetrics())
            .returns(async () =>
                Promise.resolve({
                    poolId: 'pool-id',
                    timeIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                    pendingTasksVector: [5, 5, 5, 5],
                    runningTasksVector: [2, 2, 2, 2],
                }),
            )
            .verifiable(Times.once());
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, queueMessages))
            .returns(async () => Promise.resolve(jobTasks))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .callback(q => {
                scanMessagesCount += 1;
            })
            .returns(async () => Promise.resolve([queueMessages[scanMessagesCount - 1]]))
            .verifiable(Times.exactly(taskCount));
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

    it('add tasks to the job when batch metrics is not available', async () => {
        // should fallback to default task increment count
        const taskCount = taskIncrementCountDefault;
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

        batchMock
            .setup(async o => o.getBatchMetrics())
            .returns(async () =>
                Promise.resolve({
                    poolId: 'pool-id',
                    timeIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                    pendingTasksVector: [],
                    runningTasksVector: [],
                }),
            )
            .verifiable(Times.once());
        batchMock
            .setup(async o => o.createTasks(process.env.AZ_BATCH_JOB_ID, queueMessages))
            .returns(async () => Promise.resolve(jobTasks))
            .verifiable(Times.once());

        queueMock
            .setup(async o => o.getMessages())
            .callback(q => {
                scanMessagesCount += 1;
            })
            .returns(async () => Promise.resolve([queueMessages[scanMessagesCount - 1]]))
            .verifiable(Times.exactly(taskCount));
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

    it('skip adding tasks run when message queue is empty', async () => {
        batchMock
            .setup(async o => o.getBatchMetrics())
            .returns(async () =>
                Promise.resolve({
                    poolId: 'pool-id',
                    timeIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                    pendingTasksVector: [5, 5, 5, 5],
                    runningTasksVector: [2, 2, 2, 2],
                }),
            )
            .verifiable(Times.once());
        batchMock.setup(async o => o.createTasks(It.isAny(), It.isAny())).verifiable(Times.never());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.once());

        await runner.run();
    });

    it('skip adding tasks when tasks processing ratio less than minTaskProcessingRatio', async () => {
        batchMock
            .setup(async o => o.getBatchMetrics())
            .returns(async () =>
                Promise.resolve({
                    poolId: 'pool-id',
                    timeIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                    pendingTasksVector: [50, 50, 50, 50],
                    runningTasksVector: [2, 2, 2, 2],
                }),
            )
            .verifiable(Times.once());
        batchMock.setup(async o => o.createTasks(It.isAny(), It.isAny())).verifiable(Times.never());

        queueMock
            .setup(async o => o.getMessages())
            .returns(async () => Promise.resolve([]))
            .verifiable(Times.never());

        await runner.run();
    });
});
