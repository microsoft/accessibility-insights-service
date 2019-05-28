// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-submodule-imports no-increment-decrement
import 'reflect-metadata';

import { BatchServiceClient, BatchServiceModels, Job, Task } from '@azure/batch';
import { Message } from 'axis-storage';
import { Logger } from 'logger';
import * as moment from 'moment';
import { IMock, It, Mock, Times } from 'typemoq';
import { BatchServiceClientProvider } from '../job-manager-ioc-types';
import { Batch } from './batch';
import { BatchConfig } from './batch-config';
import { JobTaskExecutionResult, JobTaskState } from './job-task';
import { RunnerTaskConfig } from './runner-task-config';

const jobId1 = 'job-1';
let batch: Batch;
let config: BatchConfig;
let batchClientStub: BatchServiceClient;
let runnerTaskConfigMock: IMock<RunnerTaskConfig>;
let jobMock: IMock<Job>;
let taskMock: IMock<Task>;
let batchServiceClientProviderStub: BatchServiceClientProvider;
let loggerMock: IMock<Logger>;
let taskEnvSettings: BatchServiceModels.EnvironmentSetting[];
let taskResourceFiles: BatchServiceModels.ResourceFile[];

function beforeEachSuit(): void {
    config = {
        accountName: '',
        accountUrl: '',
        poolId: 'poolId',
    };
    taskEnvSettings = 'env settings' as any;
    taskResourceFiles = 'task resource files' as any;

    runnerTaskConfigMock = Mock.ofType(RunnerTaskConfig);
    runnerTaskConfigMock.setup(t => t.getEnvironmentSettings()).returns(() => taskEnvSettings);
    runnerTaskConfigMock.setup(t => t.getResourceFiles()).returns(() => taskResourceFiles);

    jobMock = Mock.ofType();
    taskMock = Mock.ofType();
    batchClientStub = ({
        job: jobMock.object,
        task: taskMock.object,
    } as unknown) as BatchServiceClient;

    loggerMock = Mock.ofType(Logger);
    batchServiceClientProviderStub = async () => batchClientStub;
}

describe('waitJob()', () => {
    beforeEach(beforeEachSuit);

    it('stop wait on error', async () => {
        taskMock
            .setup(async o => o.list(jobId1, It.isAny()))
            .returns(async () => Promise.reject('error'))
            .verifiable();
        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);

        await expect(batch.waitJob(jobId1, 200)).rejects.toThrowError();
        taskMock.verifyAll();
    });

    it('wait for all tasks to complete', async () => {
        const cloudTaskListResult = <BatchServiceModels.CloudTaskListResult>[];
        for (let k = 1; k < 5; k++) {
            cloudTaskListResult.push({
                id: `job-${k}`,
                state: 'preparing',
                executionInfo: <BatchServiceModels.TaskExecutionInformation>{
                    result: JobTaskExecutionResult.success,
                },
            });
        }
        // the last task is a hosted task
        process.env.AZ_BATCH_TASK_ID = 'taskManagerId';
        cloudTaskListResult[cloudTaskListResult.length - 1].id = process.env.AZ_BATCH_TASK_ID;
        let i = 0;
        taskMock
            .setup(async o => o.list(jobId1, It.isAny()))
            .callback((id, taskListOptions) => {
                // the hosted task does not complete
                if (i < cloudTaskListResult.length - 1) {
                    cloudTaskListResult[i++].state = 'completed';
                }
            })
            .returns(async () => Promise.resolve(cloudTaskListResult.filter(r => r.state !== JobTaskState.completed) as any))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        await batch.waitJob(jobId1, 200);

        taskMock.verify(async o => o.list(jobId1, It.isAny()), Times.atLeast(3));
    });
});

describe('getCreatedTasksState()', () => {
    beforeEach(beforeEachSuit);

    it('get created job tasks state with pagination', async () => {
        const cloudTaskListResultFirst = <BatchServiceModels.CloudTaskListResult>[];
        cloudTaskListResultFirst.odatanextLink = 'nextPageLink';
        cloudTaskListResultFirst.push({
            id: 'job-1',
            state: JobTaskState.completed,
            executionInfo: <BatchServiceModels.TaskExecutionInformation>{
                result: JobTaskExecutionResult.success,
            },
        });
        const cloudTaskListResultNext: BatchServiceModels.CloudTaskListResult = <BatchServiceModels.CloudTaskListResult>[];
        cloudTaskListResultNext.push({
            id: 'job-2',
            state: JobTaskState.completed,
            executionInfo: <BatchServiceModels.TaskExecutionInformation>{
                result: JobTaskExecutionResult.success,
            },
        });
        const jobTasksExpected = [
            {
                id: 'job-1',
                state: JobTaskState.completed,
                result: JobTaskExecutionResult.success,
                correlationId: 'messageId-1',
            },
            {
                id: 'job-2',
                state: JobTaskState.completed,
                result: JobTaskExecutionResult.success,
                correlationId: 'messageId-2',
            },
        ];
        let i = 0;
        const messages = [
            {
                messageId: 'messageId-1',
                messageText: '{}',
            },
            {
                messageId: 'messageId-2',
                messageText: '{}',
            },
        ];

        taskMock
            .setup(async o => o.list(jobId1))
            .returns(async () => {
                if (i++ === 0) {
                    return Promise.resolve(cloudTaskListResultFirst as any);
                } else {
                    return Promise.resolve(<BatchServiceModels.CloudTaskListResult>{});
                }
            })
            .verifiable();
        taskMock
            .setup(async o => o.listNext('nextPageLink'))
            .returns(async () => Promise.resolve(cloudTaskListResultNext as BatchServiceModels.TaskListResponse))
            .verifiable();
        taskMock
            .setup(async o => o.addCollection(jobId1, It.isAny()))
            .returns(async () => Promise.resolve({ value: [] } as BatchServiceModels.TaskAddCollectionResponse));

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        const jobTask = await batch.createTasks(jobId1, messages);
        cloudTaskListResultFirst[0].id = jobTask[0].id;
        cloudTaskListResultNext[0].id = jobTask[1].id;
        jobTasksExpected[0].id = jobTask[0].id;
        jobTasksExpected[1].id = jobTask[1].id;

        const tasksActual = await batch.getCreatedTasksState(jobId1);

        expect(tasksActual).toEqual(jobTasksExpected);
        taskMock.verifyAll();
    });

    it('verifies taskAddParameter data', async () => {
        const cloudTaskListResultFirst = <BatchServiceModels.CloudTaskListResult>[];
        cloudTaskListResultFirst.push({
            id: jobId1,
            state: JobTaskState.completed,
            executionInfo: <BatchServiceModels.TaskExecutionInformation>{
                result: JobTaskExecutionResult.success,
            },
        });

        const messages = [
            {
                messageId: 'messageId-1',
                messageText: JSON.stringify({ msg: 'message 1 text' }),
            },
            {
                messageId: 'messageId-2',
                messageText: JSON.stringify({ msg: 'message 2 text' }),
            },
        ];
        const message1CommandLine = 'message 1 command line';
        const message2CommandLine = 'message 2 command line';

        runnerTaskConfigMock
            .setup(t => t.getCommandLine(JSON.parse(messages[0].messageText)))
            .returns(() => message1CommandLine)
            .verifiable();
        runnerTaskConfigMock
            .setup(t => t.getCommandLine(JSON.parse(messages[1].messageText)))
            .returns(() => message2CommandLine)
            .verifiable();

        let actualTaskAddParameters: BatchServiceModels.TaskAddParameter[];
        taskMock
            .setup(async o => o.addCollection(jobId1, It.isAny()))
            .callback((id, taskParameters) => {
                actualTaskAddParameters = taskParameters;
            })
            .returns(async () => Promise.resolve({ value: [] } as BatchServiceModels.TaskAddCollectionResponse));

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        await batch.createTasks(jobId1, messages);

        verifyTaskAddParameter(actualTaskAddParameters[0], message1CommandLine, messages[0].messageId);
        verifyTaskAddParameter(actualTaskAddParameters[1], message2CommandLine, messages[1].messageId);

        taskMock.verifyAll();
        runnerTaskConfigMock.verifyAll();
    });

    function verifyTaskAddParameter(
        actualTaskAddParameter: BatchServiceModels.TaskAddParameter,
        expectedCommandLineMessage: string,
        messageId: string,
    ): void {
        expect(actualTaskAddParameter.commandLine).toEqual(expectedCommandLineMessage);
        expect(actualTaskAddParameter.environmentSettings).toEqual(taskEnvSettings);
        expect(actualTaskAddParameter.resourceFiles).toEqual(taskResourceFiles);
        expect(actualTaskAddParameter.id.startsWith(`task_${messageId}_`)).toBe(true);
    }
});

describe('createTasks()', () => {
    beforeEach(beforeEachSuit);

    it('create no new tasks when no messages provided', async () => {
        const messages: Message[] = [];
        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        const tasksActual = await batch.createTasks(jobId1, messages);

        expect(tasksActual.length).toBe(0);
    });

    it('create new job tasks in batch request with success and failure ', async () => {
        const messages = [
            {
                messageText: '{}',
                messageId: 'messageId-1',
            },
            {
                messageText: '{}',
                messageId: 'messageId-2',
            },
        ];
        const taskAddCollectionResult = {
            value: [
                {
                    status: 'success',
                    taskId: '',
                },
                {
                    status: 'serverError',
                    taskId: '',
                    error: {
                        message: {
                            value: 'error',
                        },
                    },
                },
            ],
        } as BatchServiceModels.TaskAddCollectionResponse;
        const jobTasksExpected = [
            {
                id: '',
                correlationId: 'messageId-1',
                state: JobTaskState.queued,
            },
            {
                id: '',
                correlationId: 'messageId-2',
                state: JobTaskState.failed,
                error: 'error',
            },
        ];
        const expectedTaskConstraints: BatchServiceModels.TaskConstraints = {
            maxWallClockTime: moment.duration({ minute: Batch.MAX_TASK_DURATION }).toISOString(),
        };

        let actualTaskConstraints;
        let i = 0;
        taskMock
            .setup(async o => o.addCollection(jobId1, It.isAny()))
            .callback((id, taskAddParameters) =>
                taskAddParameters.forEach((taskAddParameter: BatchServiceModels.TaskAddParameter) => {
                    taskAddCollectionResult.value[i].taskId = taskAddParameter.id;
                    jobTasksExpected[i++].id = taskAddParameter.id;
                    actualTaskConstraints = taskAddParameter.constraints;
                }),
            )
            .returns(async () => Promise.resolve(taskAddCollectionResult))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        const tasksActual = await batch.createTasks(jobId1, messages);

        expect(tasksActual).toEqual(jobTasksExpected);
        expect(expectedTaskConstraints).toEqual(actualTaskConstraints);
        taskMock.verifyAll();
    });
});

describe('createJobIfNotExists()', () => {
    beforeEach(beforeEachSuit);

    it('create new job if not found', async () => {
        let jobAddParameter: any;
        const error = {
            code: 'JobNotFound',
        };
        jobMock
            .setup(async o => o.get(jobId1))
            .returns(async () => Promise.reject(error))
            .verifiable();
        jobMock
            .setup(async o => o.add(It.isAny()))
            .callback(parameter => (jobAddParameter = parameter))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        const jobIdActual = await batch.createJobIfNotExists(jobId1);

        expect(jobIdActual.startsWith(jobId1)).toBeTruthy();
        expect(jobAddParameter.id.startsWith(jobId1)).toBeTruthy();
        jobMock.verifyAll();
    });

    it('throw if server return error', async () => {
        const error = {
            code: 'requestFailed',
        };
        jobMock
            .setup(async o => o.get(jobId1))
            .returns(async () => Promise.reject(error))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        await expect(batch.createJobIfNotExists(jobId1)).rejects.toThrowError(/error occurred/);
        jobMock.verifyAll();
    });

    it('get existing active job', async () => {
        const cloudJob = {
            state: 'active',
        } as BatchServiceModels.JobGetResponse;
        jobMock
            .setup(async o => o.get(jobId1))
            .returns(async () => Promise.resolve(cloudJob))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        await expect(batch.createJobIfNotExists(jobId1)).resolves.toEqual(jobId1);
        jobMock.verifyAll();
    });

    it('ignore existing non active job', async () => {
        const cloudJob = {
            state: 'completed',
        } as BatchServiceModels.JobGetResponse;
        jobMock
            .setup(async o => o.get(jobId1))
            .returns(async () => Promise.resolve(cloudJob))
            .verifiable();

        batch = new Batch(config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
        await expect(batch.createJobIfNotExists(jobId1)).rejects.toThrowError(/not active/);
        jobMock.verifyAll();
    });
});
