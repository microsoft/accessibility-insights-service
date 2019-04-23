// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-submodule-imports no-increment-decrement
import { Message } from 'axis-storage';
import { ServiceClient, SharedKeyCredentials } from 'azure-batch';
import BatchServiceClient from 'azure-batch/lib/batchServiceClient';
import { CloudTaskListResult, TaskAddParameter, TaskExecutionInformation } from 'azure-batch/lib/models';
import { Job, Task } from 'azure-batch/lib/operations';
import * as moment from 'moment';
import { IMock, It, Mock, Times } from 'typemoq';
import { Batch } from './batch';
import { BatchConfig } from './batch-config';
import { JobTaskExecutionResult, JobTaskState } from './job-task';
import { TaskParameterBuilder } from './task-parameter-builder';

const jobId = 'job-1';
let batch: Batch;
let config: BatchConfig;
let batchClient: ServiceClient.BatchServiceClient;
let sharedKeyCredentialsMock: IMock<SharedKeyCredentials>;
let taskParameterBuilderMock: IMock<TaskParameterBuilder>;
let jobMock: IMock<Job>;
let taskMock: IMock<Task>;

function beforeEachSuit(): void {
    config = {
        accountKey: '',
        accountName: '',
        accountUrl: '',
        poolId: 'poolId',
        taskParameter: '',
    };
    sharedKeyCredentialsMock = Mock.ofType2(SharedKeyCredentials, ['accountName', 'accountKey']);
    taskParameterBuilderMock = Mock.ofType2(TaskParameterBuilder, ['{}']);
    batchClient = new BatchServiceClient(sharedKeyCredentialsMock.object, 'accountUrl');
    jobMock = Mock.ofType();
    taskMock = Mock.ofType();
    batchClient.job = jobMock.object;
    batchClient.task = taskMock.object;
}

describe('waitJob()', () => {
    beforeEach(beforeEachSuit);

    it('stop wait on error', async () => {
        taskMock
            .setup(async o => o.list(jobId, It.isAny()))
            .returns(async () => Promise.reject('error'))
            .verifiable();
        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);

        await expect(batch.waitJob(jobId, 200)).rejects.toThrowError();
        taskMock.verifyAll();
    });

    it('wait for all tasks to complete', async () => {
        const cloudTaskListResult = <CloudTaskListResult>[];
        for (let k = 1; k < 5; k++) {
            cloudTaskListResult.push({
                id: `job-${k}`,
                state: JobTaskState.queued,
                executionInfo: <TaskExecutionInformation>{
                    result: JobTaskExecutionResult.success,
                },
            });
        }
        // the last task is a hosted task
        process.env.AZ_BATCH_TASK_ID = 'taskManagerId';
        cloudTaskListResult[cloudTaskListResult.length - 1].id = process.env.AZ_BATCH_TASK_ID;
        let i = 0;
        taskMock
            .setup(async o => o.list(jobId, It.isAny()))
            .callback((id, taskListOptions) => {
                // the hosted task does not complete
                if (i < cloudTaskListResult.length - 1) {
                    cloudTaskListResult[i++].state = JobTaskState.completed;
                }
            })
            .returns(async () => Promise.resolve(cloudTaskListResult.filter(r => r.state !== JobTaskState.completed)))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        await batch.waitJob(jobId, 200);

        taskMock.verify(async o => o.list(jobId, It.isAny()), Times.atLeast(3));
    });
});

describe('getCreatedTasksState()', () => {
    beforeEach(beforeEachSuit);

    it('get created job tasks state with pagination', async () => {
        const cloudTaskListResultFirst = <CloudTaskListResult>[];
        cloudTaskListResultFirst.odatanextLink = 'nextPageLink';
        cloudTaskListResultFirst.push({
            id: 'job-1',
            state: JobTaskState.completed,
            executionInfo: <TaskExecutionInformation>{
                result: JobTaskExecutionResult.success,
            },
        });
        const cloudTaskListResultNext: CloudTaskListResult = <CloudTaskListResult>[];
        cloudTaskListResultNext.push({
            id: 'job-2',
            state: JobTaskState.completed,
            executionInfo: <TaskExecutionInformation>{
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
            .setup(async o => o.list(jobId))
            .returns(async () => {
                if (i++ === 0) {
                    return Promise.resolve(cloudTaskListResultFirst);
                } else {
                    return Promise.resolve(<CloudTaskListResult>{});
                }
            })
            .verifiable();
        taskMock
            .setup(async o => o.listNext('nextPageLink'))
            .returns(async () => Promise.resolve(cloudTaskListResultNext))
            .verifiable();
        taskMock.setup(async o => o.addCollection(jobId, It.isAny())).returns(async () => Promise.resolve({ value: [] }));

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        const jobTask = await batch.createTasks(jobId, messages);
        cloudTaskListResultFirst[0].id = jobTask[0].id;
        cloudTaskListResultNext[0].id = jobTask[1].id;
        jobTasksExpected[0].id = jobTask[0].id;
        jobTasksExpected[1].id = jobTask[1].id;

        const tasksActual = await batch.getCreatedTasksState(jobId);

        expect(tasksActual).toEqual(jobTasksExpected);
        taskMock.verifyAll();
    });
});

describe('createTasks()', () => {
    beforeEach(beforeEachSuit);

    it('create no new tasks when no messages provided', async () => {
        const messages: Message[] = [];
        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        const tasksActual = await batch.createTasks(jobId, messages);

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
        };
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
        const expectedTaskConstraints: ServiceClient.BatchServiceModels.TaskConstraints = {
            maxWallClockTime: moment.duration({ minute: Batch.MAX_TASK_DURATION }),
        };

        let actualTaskConstraints;
        let i = 0;
        taskMock
            .setup(async o => o.addCollection(jobId, It.isAny()))
            .callback((id, taskAddParameters) =>
                taskAddParameters.forEach((taskAddParameter: TaskAddParameter) => {
                    taskAddCollectionResult.value[i].taskId = taskAddParameter.id;
                    jobTasksExpected[i++].id = taskAddParameter.id;
                    actualTaskConstraints = taskAddParameter.constraints;
                }),
            )
            .returns(async () => Promise.resolve(taskAddCollectionResult))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        const tasksActual = await batch.createTasks(jobId, messages);

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
            .setup(async o => o.get(jobId))
            .returns(async () => Promise.reject(error))
            .verifiable();
        jobMock
            .setup(async o => o.add(It.isAny()))
            .callback(parameter => (jobAddParameter = parameter))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        const jobIdActual = await batch.createJobIfNotExists(jobId);

        expect(jobIdActual.startsWith(jobId)).toBeTruthy();
        expect(jobAddParameter.id.startsWith(jobId)).toBeTruthy();
        jobMock.verifyAll();
    });

    it('throw if server return error', async () => {
        const error = {
            code: 'requestFailed',
        };
        jobMock
            .setup(async o => o.get(jobId))
            .returns(async () => Promise.reject(error))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        await expect(batch.createJobIfNotExists(jobId)).rejects.toThrowError(/error occurred/);
        jobMock.verifyAll();
    });

    it('get existing active job', async () => {
        const cloudJob = {
            state: 'active',
        };
        jobMock
            .setup(async o => o.get(jobId))
            .returns(async () => Promise.resolve(cloudJob))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        await expect(batch.createJobIfNotExists(jobId)).resolves.toEqual(jobId);
        jobMock.verifyAll();
    });

    it('ignore existing non active job', async () => {
        const cloudJob = {
            state: 'completed',
        };
        jobMock
            .setup(async o => o.get(jobId))
            .returns(async () => Promise.resolve(cloudJob))
            .verifiable();

        batch = new Batch(config, taskParameterBuilderMock.object, batchClient);
        await expect(batch.createJobIfNotExists(jobId)).rejects.toThrowError(/not active/);
        jobMock.verifyAll();
    });
});
