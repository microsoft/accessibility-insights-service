// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Batch, BatchConfig, JobTask, JobTaskState, Message, PoolLoad, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { isNil } from 'lodash';
import { Logger } from 'logger';
import * as moment from 'moment';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { BatchTaskCreator } from './batch-task-creator';

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

class TestableBatchTaskCreator extends BatchTaskCreator {
    public jobManagerConfig: JobManagerConfig;
    public jobId: string;

    public getMessagesForTaskCreationCallback: () => Message[];
    public onExitCallCount: number = 0;
    public taskAddedCallback: (tasks: JobTask[]) => void;

    protected async getMessagesForTaskCreation(): Promise<Message[]> {
        if (isNil(this.getMessagesForTaskCreationCallback)) {
            return [];
        }

        return this.getMessagesForTaskCreationCallback();
    }

    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {
        if (isNil(this.taskAddedCallback)) {
            return;
        }

        this.taskAddedCallback(tasks);
    }

    protected async onExit(): Promise<void> {
        this.onExitCallCount += 1;
    }
}

describe(BatchTaskCreator, () => {
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
    let messageIdCounter: number;

    beforeEach(() => {
        currentTime = '2019-01-01';
        maxWallClockTimeInHours = 2;
        messageIdCounter = 0;
        batchConfig = {
            accountName: 'batch-account-name',
            accountUrl: '',
            poolId: 'pool-Id',
            jobId: 'batch-job-id',
        };
        batchMock = Mock.ofType(Batch, MockBehavior.Strict);
        queueMock = Mock.ofType(Queue, MockBehavior.Strict);
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        loggerMock = Mock.ofType(MockableLogger);
        systemMock = Mock.ofInstance(
            {
                wait: async milliSec => {
                    return;
                },
            } as typeof System,
            MockBehavior.Strict,
        );

        jobManagerConfig = {
            maxWallClockTimeInHours: maxWallClockTimeInHours,
            addTasksIntervalInSeconds: 10,
        } as JobManagerConfig;

        poolMetricsInfo = {
            id: 'pool-id',
            maxTasksPerPool: 4,
            load: {
                activeTasks: 4,
                runningTasks: 4,
            },
        };

        testSubject = new TestableBatchTaskCreator(
            batchMock.object,
            queueMock.object,
            batchConfig,
            serviceConfigMock.object,
            loggerMock.object,
            systemMock.object,
        );
    });

    describe('init', () => {
        it('should initialize', async () => {
            serviceConfigMock
                .setup(async s => s.getConfigValue('jobManagerConfig'))
                .returns(async () => Promise.resolve(jobManagerConfig))
                .verifiable(Times.once());

            batchMock
                .setup(async o => o.createJobIfNotExists(batchConfig.jobId, true))
                .returns(async () => Promise.resolve(batchConfig.jobId))
                .verifiable(Times.once());

            loggerMock
                .setup(async l =>
                    l.setCustomProperties({
                        batchJobId: batchConfig.jobId,
                    }),
                )
                .verifiable(Times.once());

            expect((testSubject as any).hasInitialized).toBe(false);

            await testSubject.init();

            expect(testSubject.jobId).toBe(batchConfig.jobId);
            expect(testSubject.jobManagerConfig).toBe(jobManagerConfig);
            expect((testSubject as any).hasInitialized).toBe(true);
        });
    });

    describe('run', () => {
        let getMessagesForTaskCreationMock: IMock<() => Message[]>;
        let onTaskAddedCallback: IMock<(jobTasks: JobTask[]) => Promise<void>>;

        beforeEach(() => {
            testSubject.jobId = batchConfig.jobId;
            testSubject.jobManagerConfig = jobManagerConfig;
            getMessagesForTaskCreationMock = Mock.ofInstance(() => []);
            onTaskAddedCallback = Mock.ofInstance(async () => Promise.resolve());
            testSubject.getMessagesForTaskCreationCallback = getMessagesForTaskCreationMock.object;
            testSubject.taskAddedCallback = onTaskAddedCallback.object;
            (testSubject as any).hasInitialized = true;

            batchMock
                .setup(async o => o.getPoolMetricsInfo())
                .returns(async () => Promise.resolve(poolMetricsInfo))
                .verifiable(Times.atLeastOnce());
        });

        afterEach(() => {
            onTaskAddedCallback.verifyAll();
            getMessagesForTaskCreationMock.verifyAll();
        });

        it('should throw if not initialized', async () => {
            batchMock.reset();

            (testSubject as any).hasInitialized = false;
            await expect(testSubject.run()).rejects.toEqual(new Error('[BatchTaskCreator] not initialized'));
            expect(testSubject.onExitCallCount).toBe(0);
        });

        test.each([
            {
                activeTasks: 2,
                runningTasks: 0,
            },
            {
                activeTasks: 0,
                runningTasks: 2,
            },
            {
                activeTasks: 1,
                runningTasks: 1,
            },
        ] as PoolLoad[])('exits after pending tasks - %o, if no tasks to add', async initialPoolLoad => {
            let waitCount = 0;
            setPoolLoad(initialPoolLoad);

            getMessagesForTaskCreationMock
                .setup(g => g())
                .returns(() => [])
                .verifiable(Times.exactly(3));

            systemMock
                .setup(s => s.wait(jobManagerConfig.addTasksIntervalInSeconds * 1000))
                .callback(() => {
                    waitCount += 1;

                    if (waitCount === 2) {
                        setPoolLoad({ activeTasks: 0, runningTasks: 0 });
                    }
                })
                .verifiable(Times.exactly(2));

            await testSubject.run();

            expect(testSubject.onExitCallCount).toBe(1);
        });

        test.each([
            {
                activeTasks: 1,
                runningTasks: 0,
            },
            {
                activeTasks: 0,
                runningTasks: 1,
            },
            {
                activeTasks: 0,
                runningTasks: 0,
            },
        ] as PoolLoad[])('exits immediately if no tasks to add & no pending tasks - %o', async initialPoolLoad => {
            setPoolLoad(initialPoolLoad);

            getMessagesForTaskCreationMock
                .setup(g => g())
                .returns(() => [])
                .verifiable(Times.exactly(1));

            await testSubject.run();

            expect(testSubject.onExitCallCount).toBe(1);
        });

        it('adds tasks till restart timeout is reached', async () => {
            const startTime = currentTime;

            setPoolLoad({ activeTasks: 2, runningTasks: 5 });
            let callCount = 0;
            let waitCount = 0;

            const messagesBatch1 = generateMessages(5);
            const messagesBatch2 = generateMessages(5);
            const jobTasksBatch1 = generateJobTasks(messagesBatch1);
            const jobTasksBatch2 = generateJobTasks(messagesBatch2);

            setupVerifiableBatchCreateTasksCall(messagesBatch1, jobTasksBatch1);
            setupVerifiableBatchCreateTasksCall(messagesBatch2, jobTasksBatch2);

            setupVerifiableDeleteQueueMessagesCall(messagesBatch1);
            setupVerifiableDeleteQueueMessagesCall(messagesBatch2);
            setupVerifiableOnTaskAddedCall(jobTasksBatch1);
            setupVerifiableOnTaskAddedCall(jobTasksBatch2);

            getMessagesForTaskCreationMock
                .setup(g => g())
                .returns(() => {
                    callCount += 1;
                    if (callCount === 1) {
                        return messagesBatch1;
                    }

                    currentTime = moment(startTime)
                        .add(maxWallClockTimeInHours, 'hour')
                        .toDate()
                        .toJSON();

                    return messagesBatch2;
                })
                .verifiable(Times.exactly(2));

            systemMock
                .setup(s => s.wait(jobManagerConfig.addTasksIntervalInSeconds * 1000))
                .returns(async () => Promise.resolve())
                .verifiable(Times.exactly(1));

            systemMock
                .setup(s => s.wait(5000))
                .callback(() => {
                    waitCount += 1;

                    if (waitCount === 2) {
                        setPoolLoad({ activeTasks: 0, runningTasks: 0 });
                    }
                })
                .returns(async () => Promise.resolve())
                .verifiable(Times.exactly(2));
            await testSubject.run();

            expect(testSubject.onExitCallCount).toBe(1);
        });

        it('deletes queue messages after creating queueing tasks', async () => {
            const startTime = currentTime;

            setPoolLoad({ activeTasks: 0, runningTasks: 1 });

            const messagesBatch1 = generateMessages(5);
            const jobTasksBatch1 = generateJobTasks(messagesBatch1);
            jobTasksBatch1[0].state = JobTaskState.failed;
            const expectedDeletedMessages = messagesBatch1.slice(1);

            setupVerifiableBatchCreateTasksCall(messagesBatch1, jobTasksBatch1);

            setupVerifiableDeleteQueueMessagesCall(expectedDeletedMessages);
            setupVerifiableOnTaskAddedCall(generateJobTasks(expectedDeletedMessages));

            getMessagesForTaskCreationMock
                .setup(g => g())
                .returns(() => {
                    currentTime = moment(startTime)
                        .add(maxWallClockTimeInHours, 'hour')
                        .toDate()
                        .toJSON();

                    return messagesBatch1;
                })
                .verifiable(Times.once());

            await testSubject.run();

            expect(testSubject.onExitCallCount).toBe(1);
        });

        function setPoolLoad(load: PoolLoad): void {
            poolMetricsInfo = {
                load: load,
            } as PoolMetricsInfo;
        }

        function setupVerifiableBatchCreateTasksCall(messages: Message[], jobTasks: JobTask[]): void {
            batchMock
                .setup(async b => b.createTasks(batchConfig.jobId, It.isValue(messages)))
                .returns(async () => Promise.resolve(jobTasks))
                .verifiable(Times.once());
        }

        function setupVerifiableDeleteQueueMessagesCall(messages: Message[]): void {
            for (const message of messages) {
                setupVerifiableDeleteQueueMessageCall(message);
            }
        }

        function setupVerifiableDeleteQueueMessageCall(message: Message): void {
            queueMock
                .setup(async q => q.deleteMessage(message))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        }

        function setupVerifiableOnTaskAddedCall(jobTasks: JobTask[]): void {
            onTaskAddedCallback
                .setup(t => t(jobTasks))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        }
    });

    function generateMessages(totalCount: number): Message[] {
        const messages: Message[] = [];
        for (let count = 1; count <= totalCount; count += 1) {
            messageIdCounter += 1;
            messages.push({
                messageId: `id-${messageIdCounter}`,
                messageText: `message text for ${messageIdCounter}`,
            });
        }

        return messages;
    }

    function generateJobTasks(messages: Message[]): JobTask[] {
        const jobTasks: JobTask[] = [];

        for (const message of messages) {
            jobTasks.push({
                correlationId: message.messageId,
                id: `task-${message.messageId}`,
                state: JobTaskState.queued,
                result: undefined,
            });
        }

        return jobTasks;
    }
    afterEach(() => {
        batchMock.verifyAll();
        queueMock.verifyAll();
        serviceConfigMock.verifyAll();
        systemMock.verifyAll();
        loggerMock.verifyAll();
    });
});
