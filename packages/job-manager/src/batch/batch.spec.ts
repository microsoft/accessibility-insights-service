// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-object-literal-type-assertion no-unsafe-any no-submodule-imports no-increment-decrement
import 'reflect-metadata';

import { BatchServiceClient, BatchServiceModels, Job, Pool, Task } from '@azure/batch';
import { PoolEvaluateAutoScaleResponse } from '@azure/batch/esm/models';
import { Message } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, TaskRuntimeConfig } from 'common';
import { Logger } from 'logger';
import * as moment from 'moment';
import { IMock, It, Mock } from 'typemoq';
import { BatchServiceClientProvider } from '../job-manager-ioc-types';
import { Batch } from './batch';
import { BatchConfig } from './batch-config';
import { JobTaskExecutionResult, JobTaskState } from './job-task';
import { RunnerTaskConfig } from './runner-task-config';

describe(Batch, () => {
    const jobId1 = 'job-1';
    let batch: Batch;
    let config: BatchConfig;
    let batchClientStub: BatchServiceClient;
    let runnerTaskConfigMock: IMock<RunnerTaskConfig>;
    let jobMock: IMock<Job>;
    let taskMock: IMock<Task>;
    let poolMock: IMock<Pool>;
    let batchServiceClientProviderStub: BatchServiceClientProvider;
    let loggerMock: IMock<Logger>;
    let taskEnvSettings: BatchServiceModels.EnvironmentSetting[];
    let taskResourceFiles: BatchServiceModels.ResourceFile[];
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let maxTaskDurationInMinutes: number;
    let maxTaskProcessingRatioDefault: number;
    let taskProcessingSamplingIntervalInMinutesDefault: number;

    beforeEach(() => {
        maxTaskDurationInMinutes = 5;
        maxTaskProcessingRatioDefault = 0.5;
        taskProcessingSamplingIntervalInMinutesDefault = 15;
        config = {
            accountName: '',
            accountUrl: '',
            poolId: 'poolId',
        };
        taskEnvSettings = 'env settings' as any;
        taskResourceFiles = 'task resource files' as any;

        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async s => s.getConfigValue('taskConfig'))
            .returns(async () => {
                return {
                    taskTimeoutInMinutes: maxTaskDurationInMinutes,
                } as TaskRuntimeConfig;
            });
        serviceConfigMock
            .setup(async s => s.getConfigValue('jobManagerConfig'))
            .returns(async () => {
                return {
                    maxTaskProcessingRatio: maxTaskProcessingRatioDefault,
                    taskProcessingSamplingIntervalInMinutes: taskProcessingSamplingIntervalInMinutesDefault,
                } as JobManagerConfig;
            });
        runnerTaskConfigMock = Mock.ofType(RunnerTaskConfig);
        runnerTaskConfigMock.setup(t => t.getEnvironmentSettings()).returns(() => taskEnvSettings);
        runnerTaskConfigMock.setup(t => t.getResourceFiles()).returns(() => taskResourceFiles);

        jobMock = Mock.ofType();
        taskMock = Mock.ofType();
        poolMock = Mock.ofType();
        batchClientStub = ({
            job: jobMock.object,
            task: taskMock.object,
            pool: poolMock.object,
        } as unknown) as BatchServiceClient;

        loggerMock = Mock.ofType(Logger);
        batchServiceClientProviderStub = async () => batchClientStub;

        batch = new Batch(serviceConfigMock.object, config, runnerTaskConfigMock.object, batchServiceClientProviderStub, loggerMock.object);
    });

    describe('getBatchMetrics()', () => {
        it('evaluate formula to get batch metrics', async () => {
            const batchMetricsExpected = {
                poolId: 'poolId',
                timeIntervalInMinutes: 15,
                pendingTasksVector: [1, 2, 3],
                runningTasksVector: [4, 5, 6],
            };
            poolMock
                .setup(async o => o.evaluateAutoScale(config.poolId, It.isAny()))
                .returns(async () =>
                    Promise.resolve(<PoolEvaluateAutoScaleResponse>(<unknown>{
                        // tslint:disable-next-line: max-line-length
                        results: `$TargetDedicatedNodes=2;$TargetLowPriorityNodes=0;$NodeDeallocationOption=requeue;$pendingTasksVector=[1,2,3];$runningTasksVector=[4,5,6]`,
                    })),
                )
                .verifiable();

            const batchMetrics = await batch.getBatchMetrics();

            expect(batchMetrics).toEqual(batchMetricsExpected);
            poolMock.verifyAll();
        });
    });

    describe('getCreatedTasksState()', () => {
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
        it('create no new tasks when no messages provided', async () => {
            const messages: Message[] = [];
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
                maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString(),
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

            const tasksActual = await batch.createTasks(jobId1, messages);

            expect(tasksActual).toEqual(jobTasksExpected);
            expect(expectedTaskConstraints).toEqual(actualTaskConstraints);
            taskMock.verifyAll();
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
