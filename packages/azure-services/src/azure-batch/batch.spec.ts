// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-submodule-imports no-increment-decrement max-func-body-length max-line-length
import 'reflect-metadata';

import { BatchServiceClient, BatchServiceModels, Job, Pool, Task } from '@azure/batch';
import {
    ErrorCategory,
    JobGetTaskCountsResponse,
    JobListResponse,
    PoolGetResponse,
    TaskExecutionInformation,
    TaskFailureInformation,
    TaskListResponse,
} from '@azure/batch/esm/models';
import { ServiceConfiguration, TaskRuntimeConfig } from 'common';
import * as moment from 'moment';
import { IMock, It, Mock, Times } from 'typemoq';
import { StorageContainerSASUrlProvider } from '../azure-blob/storage-container-sas-url-provider';
import { Message } from '../azure-queue/message';
import { BatchServiceClientProvider } from '../ioc-types';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { Batch } from './batch';
import { BatchConfig } from './batch-config';
import { BatchTaskParameterProvider } from './batch-task-parameter-provider';
import { BatchTask, JobTaskState } from './job-task';

export interface JobListItemStub {
    id: string;
}

export class JobListStub {
    public odatanextLink: string;

    public constructor(public items: JobListItemStub[]) {}

    public values(): JobListItemStub[] {
        return this.items;
    }
}

export class TaskListStub {
    public odatanextLink: string;

    public constructor(public items: any[]) {}

    public values(): any[] {
        return this.items;
    }
}

describe(Batch, () => {
    const jobId1 = 'job-1';
    const containerSASUrl = 'https://testcontainer.blob.core.windiows.net/batch-logs/?sv=blah$se=blah';

    let batch: Batch;
    let config: BatchConfig;
    let batchClientStub: BatchServiceClient;
    let jobMock: IMock<Job>;
    let taskMock: IMock<Task>;
    let poolMock: IMock<Pool>;
    let storageContainerSASUrlProviderMock: IMock<StorageContainerSASUrlProvider>;
    let batchServiceClientProviderStub: BatchServiceClientProvider;
    let loggerMock: IMock<MockableLogger>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let batchTaskParameterProvider: IMock<BatchTaskParameterProvider>;
    let maxTaskDurationInMinutes: number;
    let taskParameter: BatchServiceModels.TaskAddParameter;
    const maxTasks = 10;

    beforeEach(() => {
        maxTaskDurationInMinutes = 5;
        config = {
            accountName: '',
            accountUrl: '',
            poolId: 'poolId',
            jobId: 'jobId',
        };
        taskParameter = {
            id: 'taskId',
            commandLine: 'commandLine',
            resourceFiles: 'resourceFiles' as any,
            environmentSettings: 'environmentSettings' as any,
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('taskConfig'))
            .returns(async () => {
                return {
                    taskTimeoutInMinutes: maxTaskDurationInMinutes,
                } as TaskRuntimeConfig;
            });
        batchTaskParameterProvider = Mock.ofType<BatchTaskParameterProvider>();
        jobMock = Mock.ofType();
        taskMock = Mock.ofType();
        poolMock = Mock.ofType();
        batchClientStub = ({
            job: jobMock.object,
            task: taskMock.object,
            pool: poolMock.object,
        } as unknown) as BatchServiceClient;
        loggerMock = Mock.ofType(MockableLogger);
        batchServiceClientProviderStub = async () => batchClientStub;
        storageContainerSASUrlProviderMock = Mock.ofType(StorageContainerSASUrlProvider);
        storageContainerSASUrlProviderMock
            .setup(async c => c.generateSASUrl(It.isAny()))
            .returns(async () => {
                return containerSASUrl;
            });
        batch = new Batch(
            batchServiceClientProviderStub,
            batchTaskParameterProvider.object,
            storageContainerSASUrlProviderMock.object,
            config,
            loggerMock.object,
            maxTasks,
        );
    });

    describe('getFailedTasks()', () => {
        it('get failed tasks', async () => {
            const timestamp = new Date();
            const taskArguments = {
                arg1: 'arg-1-value',
                arg2: 'arg-2-value',
            };
            const tasks = [
                {
                    id: 'id-1: task with full failure info',
                    environmentSettings: [
                        { name: 'name-1', value: 'value-1' },
                        { name: 'TASK_ARGUMENTS', value: JSON.stringify(taskArguments) },
                    ] as BatchServiceModels.EnvironmentSetting[],
                    executionInfo: {
                        exitCode: 1,
                        result: 'failure',
                        failureInfo: {
                            category: 'userError' as ErrorCategory,
                            code: '1',
                            message: 'The task was ended by user request',
                            details: [
                                {
                                    name: 'Message',
                                    value: 'The maximum execution time configured on the task was exceeded',
                                },
                                {
                                    name: 'AdditionalErrorCode',
                                    value: 'FailureExitCode',
                                },
                            ],
                        } as TaskFailureInformation,
                    } as TaskExecutionInformation,
                    stateTransitionTime: timestamp,
                },
                {
                    id: 'id-2: task with empty failure info',
                    environmentSettings: [
                        { name: 'name-1', value: 'value-1' },
                        { name: 'TASK_ARGUMENTS', value: JSON.stringify(taskArguments) },
                    ] as BatchServiceModels.EnvironmentSetting[],
                    executionInfo: {
                        exitCode: 1,
                        result: 'failure',
                        failureInfo: undefined,
                    } as TaskExecutionInformation,
                    stateTransitionTime: timestamp,
                },
                {
                    id: 'id-3: task with empty failure details info',
                    environmentSettings: [
                        { name: 'name-1', value: 'value-1' },
                        { name: 'TASK_ARGUMENTS', value: JSON.stringify(taskArguments) },
                    ] as BatchServiceModels.EnvironmentSetting[],
                    executionInfo: {
                        exitCode: 1,
                        result: 'failure',
                        failureInfo: {
                            category: 'userError' as ErrorCategory,
                            code: '1',
                            message: 'The task was ended by user request',
                        } as TaskFailureInformation,
                    } as TaskExecutionInformation,
                    stateTransitionTime: timestamp,
                },
                {
                    id: 'id-4: task without environment settings data',
                    environmentSettings: undefined,
                    executionInfo: {
                        exitCode: 1,
                        result: 'failure',
                        failureInfo: {
                            category: 'userError' as ErrorCategory,
                            code: '1',
                            message: 'The task was ended by user request',
                        } as TaskFailureInformation,
                    } as TaskExecutionInformation,
                    stateTransitionTime: timestamp,
                },
                {
                    id: 'id-5: task without TASK_ARGUMENTS environment value',
                    environmentSettings: [{ name: 'name-1', value: 'value-1' }] as BatchServiceModels.EnvironmentSetting[],
                    executionInfo: {
                        exitCode: 1,
                        result: 'failure',
                        failureInfo: {
                            category: 'userError' as ErrorCategory,
                            code: '1',
                            message: 'The task was ended by user request',
                        } as TaskFailureInformation,
                    } as TaskExecutionInformation,
                    stateTransitionTime: timestamp,
                },
            ];

            const items1 = new TaskListStub(tasks.slice(0, 2));
            items1.odatanextLink = 'odatanextLink-1';
            const items2 = new TaskListStub(tasks.slice(2, tasks.length));

            const options = {
                taskListOptions: { filter: `state eq 'completed' and executionInfo/result eq 'failure'` },
            };
            taskMock
                .setup(async o => o.list(config.jobId, options))
                .returns(async () => Promise.resolve(<TaskListResponse>(<unknown>items1)))
                .verifiable();
            taskMock
                .setup(async o => o.listNext(items1.odatanextLink, options))
                .returns(async () => Promise.resolve(<TaskListResponse>(<unknown>items2)))
                .verifiable();

            const expectedFailedTasks: BatchTask[] = [
                {
                    id: 'id-1: task with full failure info',
                    taskArguments: '{"arg1":"arg-1-value","arg2":"arg-2-value"}',
                    exitCode: 1,
                    result: 'failure',
                    failureInfo: {
                        category: 'userError',
                        code: '1',
                        message: `Message: The maximum execution time configured on the task was exceeded, AdditionalErrorCode: FailureExitCode`,
                    },
                    timestamp,
                },
                {
                    id: 'id-2: task with empty failure info',
                    taskArguments: '{"arg1":"arg-1-value","arg2":"arg-2-value"}',
                    exitCode: 1,
                    result: 'failure',
                    failureInfo: undefined,
                    timestamp,
                },
                {
                    id: 'id-3: task with empty failure details info',
                    taskArguments: '{"arg1":"arg-1-value","arg2":"arg-2-value"}',
                    exitCode: 1,
                    result: 'failure',
                    failureInfo: { category: 'userError', code: '1', message: 'The task was ended by user request' },
                    timestamp,
                },
                {
                    id: 'id-4: task without environment settings data',
                    taskArguments: undefined,
                    exitCode: 1,
                    result: 'failure',
                    failureInfo: { category: 'userError', code: '1', message: 'The task was ended by user request' },
                    timestamp: timestamp,
                },
                {
                    id: 'id-5: task without TASK_ARGUMENTS environment value',
                    taskArguments: undefined,
                    exitCode: 1,
                    result: 'failure',
                    failureInfo: { category: 'userError', code: '1', message: 'The task was ended by user request' },
                    timestamp,
                },
            ];

            const failedTasks = await batch.getFailedTasks(config.jobId);

            expect(failedTasks).toEqual(expectedFailedTasks);
            taskMock.verifyAll();
        });
    });

    describe('getPoolMetricsInfo()', () => {
        it('get pool metrics info', async () => {
            const poolMetricsInfoExpected = {
                id: 'poolId',
                maxTasksPerPool: 32,
                load: {
                    activeTasks: 4,
                    runningTasks: 7,
                },
            };
            poolMock
                .setup(async o => o.get(config.poolId))
                .returns(async () =>
                    Promise.resolve(<PoolGetResponse>(<unknown>{
                        maxTasksPerNode: 8,
                        currentDedicatedNodes: 3,
                        currentLowPriorityNodes: 1,
                    })),
                )
                .verifiable();

            const options = {
                jobListOptions: { filter: `state eq 'active' and executionInfo/poolId eq '${config.poolId}'` },
            };
            const items1 = new JobListStub([{ id: 'job-id-1' }]);
            items1.odatanextLink = 'odatanextLink-1';
            const items2 = new JobListStub([{ id: 'job-id-2' }]);
            jobMock
                .setup(async o => o.list(options))
                .returns(async () => Promise.resolve(<JobListResponse>(<unknown>items1)))
                .verifiable();
            jobMock
                .setup(async o => o.listNext(items1.odatanextLink, options))
                .returns(async () => Promise.resolve(<JobListResponse>(<unknown>items2)))
                .verifiable();
            jobMock
                .setup(async o => o.getTaskCounts(items1.items[0].id))
                .returns(async () => Promise.resolve(<JobGetTaskCountsResponse>(<unknown>{ active: 1, running: 2 })))
                .verifiable();
            jobMock
                .setup(async o => o.getTaskCounts(items2.items[0].id))
                .returns(async () => Promise.resolve(<JobGetTaskCountsResponse>(<unknown>{ active: 3, running: 5 })))
                .verifiable();

            const poolMetricsInfo = await batch.getPoolMetricsInfo();

            expect(poolMetricsInfo).toEqual(poolMetricsInfoExpected);
            poolMock.verifyAll();
            jobMock.verifyAll();
        });
    });

    describe('createTasks()', () => {
        it('create no new tasks when no messages provided', async () => {
            const messages: Message[] = [];
            const tasksActual = await batch.createTasks(jobId1, messages);

            expect(tasksActual.length).toBe(0);
        });

        it('should add no more than maxTasks tasks in a single Batch API call', async () => {
            const messagesCount = maxTasks + 3;
            const messages = [];
            const tasksAddedBatchCount: number[] = [];
            const taskAddParameters: BatchServiceModels.TaskAddParameter[] = [];
            let taskAddCollectionResponse: BatchServiceModels.TaskAddCollectionResponse;

            for (let i = 0; i < messagesCount; i++) {
                const message = {
                    messageText: '{}',
                    messageId: `message-id-${i}`,
                };
                messages.push(message);

                taskAddParameters.push({
                    id: '',
                    commandLine: `commandLine-${i}`,
                    resourceFiles: `resourceFiles-${i}` as any,
                    environmentSettings: `environmentSettings-${i}` as any,
                    constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
                });

                batchTaskParameterProvider
                    .setup(async o =>
                        o.getTaskParameter(
                            It.is(actualId => isExpectedId(actualId, message.messageId)),
                            message.messageText,
                        ),
                    )
                    .callback((taskId, messageText) => (taskAddParameters[i].id = taskId))
                    .returns(async () => Promise.resolve(taskAddParameters[i]))
                    .verifiable(Times.once());
            }

            taskMock
                .setup(async o => o.addCollection(jobId1, It.isAny()))
                .callback((id, taskParameters) => {
                    tasksAddedBatchCount.push(taskParameters.length);
                    taskAddCollectionResponse = <BatchServiceModels.TaskAddCollectionResponse>(<unknown>{ value: [] });
                    taskParameters.forEach((taskAddParameter: BatchServiceModels.TaskAddParameter) => {
                        taskAddCollectionResponse.value.push({ taskId: taskAddParameter.id, status: 'success' });
                    });
                })
                .returns(async () => Promise.resolve(<BatchServiceModels.TaskAddCollectionResponse>(<unknown>taskAddCollectionResponse)))
                .verifiable(Times.exactly(2));

            const tasksActual = await batch.createTasks(jobId1, messages);

            expect(tasksActual.length).toEqual(messagesCount);
            expect(tasksAddedBatchCount.length).toEqual(2);
            expect(tasksAddedBatchCount[0]).toEqual(maxTasks);
            expect(tasksAddedBatchCount[1]).toEqual(3);
            taskMock.verifyAll();
            batchTaskParameterProvider.verifyAll();
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
            const expectedTaskAddParameters = [
                {
                    id: '',
                    commandLine: 'commandLine-1',
                    resourceFiles: 'resourceFiles-1' as any,
                    environmentSettings: 'environmentSettings-1' as any,
                    constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
                },
                {
                    id: '',
                    commandLine: 'commandLine-2',
                    resourceFiles: 'resourceFiles-2' as any,
                    environmentSettings: 'environmentSettings-2' as any,
                    constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
                },
            ];

            let i = 0;
            taskMock
                .setup(async o => o.addCollection(jobId1, It.isAny()))
                .callback((id, taskAddParameters) =>
                    taskAddParameters.forEach((taskAddParameter: BatchServiceModels.TaskAddParameter) => {
                        taskAddCollectionResult.value[i].taskId = taskAddParameter.id;
                        expectedTaskAddParameters[i].id = taskAddParameter.id;
                        jobTasksExpected[i++].id = taskAddParameter.id;
                    }),
                )
                .returns(async () => Promise.resolve(taskAddCollectionResult))
                .verifiable();

            for (let k = 0; k < messages.length; k++) {
                batchTaskParameterProvider
                    .setup(async o =>
                        o.getTaskParameter(
                            It.is(actualId => isExpectedId(actualId, messages[k].messageId)),
                            messages[k].messageText,
                        ),
                    )
                    .callback((taskId, messageText) => (expectedTaskAddParameters[k].id = taskId))
                    .returns(async () => Promise.resolve(expectedTaskAddParameters[k]))
                    .verifiable(Times.once());
            }

            const tasksActual = await batch.createTasks(jobId1, messages);

            expect(tasksActual).toEqual(jobTasksExpected);
            taskMock.verifyAll();
            batchTaskParameterProvider.verifyAll();
        });

        it('verifies tasks parameters on creation', async () => {
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
            const expectedTaskAddParameters = [
                {
                    id: 'taskId-1',
                    commandLine: 'commandLine-1',
                    resourceFiles: 'resourceFiles-1' as any,
                    environmentSettings: 'environmentSettings-1' as any,
                    constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
                },
                {
                    id: 'taskId-2',
                    commandLine: 'commandLine-2',
                    resourceFiles: 'resourceFiles-2' as any,
                    environmentSettings: 'environmentSettings-2' as any,
                    constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
                },
            ];

            for (let k = 0; k < messages.length; k++) {
                batchTaskParameterProvider
                    .setup(async o =>
                        o.getTaskParameter(
                            It.is(actualId => isExpectedId(actualId, messages[k].messageId)),
                            messages[k].messageText,
                        ),
                    )
                    .returns(async () => Promise.resolve(expectedTaskAddParameters[k]))
                    .verifiable(Times.once());
            }

            let actualTaskAddParameters: BatchServiceModels.TaskAddParameter[];
            taskMock
                .setup(async o => o.addCollection(jobId1, It.isAny()))
                .callback((id, taskParameters) => {
                    actualTaskAddParameters = taskParameters;
                })
                .returns(async () => Promise.resolve({ value: [] } as BatchServiceModels.TaskAddCollectionResponse));

            await batch.createTasks(jobId1, messages);

            expect(actualTaskAddParameters[0]).toEqual(expectedTaskAddParameters[0]);
            expect(actualTaskAddParameters[1]).toEqual(expectedTaskAddParameters[1]);
            taskMock.verifyAll();
            batchTaskParameterProvider.verifyAll();
        });
    });

    describe('createJobIfNotExists()', () => {
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

            await expect(batch.createJobIfNotExists(jobId1)).rejects.toThrowError(/not active/);
            jobMock.verifyAll();
        });
    });
});

function isExpectedId(actualId: string, messageId: string): boolean {
    return actualId.startsWith(`task_${messageId}_`);
}
