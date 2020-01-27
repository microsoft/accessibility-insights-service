// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports
import { BatchServiceModels } from '@azure/batch';
import { CloudJob, CloudTask, JobListOptions, OutputFile, TaskListOptions } from '@azure/batch/esm/models';
import { System } from 'common';
import * as crypto from 'crypto';
import { inject, injectable, optional } from 'inversify';
import * as _ from 'lodash';
import { Logger } from 'logger';
import { VError } from 'verror';
import { StorageContainerSASUrlProvider } from '../azure-blob/storage-container-sas-url-provider';
import { Message } from '../azure-queue/message';
import { BatchServiceClientProvider, iocTypeNames } from '../ioc-types';
import { BatchConfig } from './batch-config';
import { BatchTaskParameterProvider } from './batch-task-parameter-provider';
import { BatchTask, BatchTaskErrorCategory, BatchTaskFailureInfo, JobTask, JobTaskState } from './job-task';
import { PoolLoad, PoolMetricsInfo } from './pool-load-generator';

@injectable()
export class Batch {
    public static readonly batchLogContainerName = 'batch-logs';

    public constructor(
        @inject(iocTypeNames.BatchServiceClientProvider) private readonly batchClientProvider: BatchServiceClientProvider,
        @optional()
        @inject(iocTypeNames.BatchTaskParameterProvider)
        private readonly batchTaskParameterProvider: BatchTaskParameterProvider,
        @inject(StorageContainerSASUrlProvider) private readonly containerSASUrlProvider: StorageContainerSASUrlProvider,
        @inject(BatchConfig) private readonly config: BatchConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async getFailedTasks(jobId: string): Promise<BatchTask[]> {
        const batchTasks: BatchTask[] = [];
        const tasks = await this.getFailedTaskList(jobId);
        tasks.map(task => {
            const taskArguments =
                task.environmentSettings !== undefined ? task.environmentSettings.find(e => e.name === 'TASK_ARGUMENTS') : undefined;

            let failureInfo: BatchTaskFailureInfo;
            if (task.executionInfo.failureInfo !== undefined) {
                let message = '';
                if (task.executionInfo.failureInfo.details !== undefined) {
                    task.executionInfo.failureInfo.details.forEach(details => {
                        message = `${message}${details.name}: ${details.value}\n`;
                    });
                    message = message.slice(0, -1);
                } else {
                    message = task.executionInfo.failureInfo.message;
                }

                failureInfo = {
                    category: task.executionInfo.failureInfo.category as BatchTaskErrorCategory,
                    code: task.executionInfo.failureInfo.code,
                    message,
                };
            }

            batchTasks.push({
                id: task.id,
                taskArguments: taskArguments !== undefined ? taskArguments.value : undefined,
                exitCode: task.executionInfo.exitCode,
                result: task.executionInfo.result,
                failureInfo,
                timestamp: task.stateTransitionTime,
            });
        });

        return batchTasks;
    }

    public async getPoolMetricsInfo(): Promise<PoolMetricsInfo> {
        const maxTasksPerPool = await this.getMaxTasksPerPool();
        const currentPoolLoad = await this.getCurrentPoolLoad();

        return {
            id: this.config.poolId,
            maxTasksPerPool: maxTasksPerPool,
            load: currentPoolLoad,
        };
    }

    public async createJobIfNotExists(jobId: string, addJobIdIndexOnCreate: boolean = false): Promise<string> {
        let serviceJobId = jobId;
        const client = await this.batchClientProvider();

        try {
            const cloudJob = await client.job.get(serviceJobId);
            if (cloudJob.state !== 'active') {
                throw new VError(`The job ${serviceJobId} is not active and cannot be used to run new tasks.`);
            }
        } catch (error) {
            if ((<BatchServiceModels.BatchError>(<unknown>error)).code === 'JobNotFound') {
                if (addJobIdIndexOnCreate) {
                    serviceJobId = `${jobId}_${crypto.randomBytes(5).toString('hex')}`;
                }

                const jobAddParameter: BatchServiceModels.JobAddParameter = {
                    id: serviceJobId,
                    poolInfo: {
                        poolId: this.config.poolId,
                    },
                    onAllTasksComplete: 'terminatejob',
                };

                await client.job.add(jobAddParameter);

                this.logger.logInfo(`New job ${serviceJobId} created.`);
            } else {
                throw new VError(error as Error, `An error occurred while retrieving state of ${jobId} job.`);
            }
        }

        return serviceJobId;
    }

    public async createTasks(jobId: string, queueMessages: Message[]): Promise<JobTask[]> {
        const tasks: JobTask[] = [];

        // Azure Batch supports the maximum 100 tasks to be added in a single addTaskCollection() API call
        const chunks = System.chunkArray(queueMessages, 100);
        await Promise.all(
            chunks.map(async chunk => {
                const taskCollection = await this.addTaskCollection(jobId, chunk);
                tasks.push(...taskCollection);
            }),
        );

        return tasks;
    }

    private async getMaxTasksPerPool(): Promise<number> {
        const client = await this.batchClientProvider();
        const poolInfo = await client.pool.get(this.config.poolId);

        return poolInfo.maxTasksPerNode * (poolInfo.currentDedicatedNodes + poolInfo.currentLowPriorityNodes);
    }

    private async getCurrentPoolLoad(): Promise<PoolLoad> {
        const activeJobIds = await this.getActiveJobIds();

        let activeTasks = 0;
        let runningTasks = 0;

        const client = await this.batchClientProvider();
        await Promise.all(
            activeJobIds.map(async jobId => {
                const jobInfo = await client.job.getTaskCounts(jobId);
                activeTasks += jobInfo.active;
                runningTasks += jobInfo.running;
            }),
        );

        return {
            activeTasks: activeTasks,
            runningTasks: runningTasks,
        };
    }

    private async getFailedTaskList(jobId: string): Promise<CloudTask[]> {
        const filterClause = `state eq 'completed' and executionInfo/result eq 'failure'`;

        return this.getTaskList(jobId, { filter: filterClause });
    }

    private async getTaskList(jobId: string, options?: TaskListOptions): Promise<CloudTask[]> {
        const tasks = [];
        const taskOptions = {
            taskListOptions: options,
        };

        const client = await this.batchClientProvider();
        const taskListResponse = await client.task.list(jobId, taskOptions);
        tasks.push(...taskListResponse.values());

        let odatanextLink = taskListResponse.odatanextLink;
        while (odatanextLink !== undefined) {
            const taskListResponseNext = await client.task.listNext(odatanextLink, taskOptions);
            tasks.push(...taskListResponseNext.values());
            odatanextLink = taskListResponseNext.odatanextLink;
        }

        return tasks;
    }

    private async getActiveJobIds(): Promise<string[]> {
        const filterClause = `state eq 'active' and executionInfo/poolId eq '${this.config.poolId}'`;
        const jobs = await this.getJobList({ filter: filterClause });

        return jobs.map(i => i.id);
    }

    private async getJobList(options?: JobListOptions): Promise<CloudJob[]> {
        const jobs = [];
        const listOptions = {
            jobListOptions: options,
        };

        const client = await this.batchClientProvider();
        const jobListResponse = await client.job.list(listOptions);
        jobs.push(...jobListResponse.values());

        let odatanextLink = jobListResponse.odatanextLink;
        while (odatanextLink !== undefined) {
            const jobListResponseNext = await client.job.listNext(odatanextLink, listOptions);
            jobs.push(...jobListResponseNext.values());
            odatanextLink = jobListResponseNext.odatanextLink;
        }

        return jobs;
    }

    private async addTaskCollection(jobId: string, messages: Message[]): Promise<JobTask[]> {
        if (messages.length === 0) {
            return [];
        }

        const jobTasks: Map<string, JobTask> = new Map();
        const taskAddParameters: BatchServiceModels.TaskAddParameter[] = [];
        let sasUrl: string;

        try {
            sasUrl = await this.containerSASUrlProvider.generateSASUrl(Batch.batchLogContainerName);
        } catch (error) {
            this.logger.logError(`Encountered the error while generating Blob Storage SAS URL. ${error}`, {
                blobContainerName: Batch.batchLogContainerName,
            });
        }

        await Promise.all(
            messages.map(async message => {
                const jobTask = new JobTask(message.messageId);
                jobTasks.set(jobTask.id, jobTask);
                const taskAddParameter = await this.getTaskAddParameter(jobId, jobTask.id, message.messageText, sasUrl);
                taskAddParameters.push(taskAddParameter);
            }),
        );

        const client = await this.batchClientProvider();
        const taskAddCollectionResult = await client.task.addCollection(jobId, taskAddParameters);
        taskAddCollectionResult.value.forEach(taskAddResult => {
            if (/success/i.test(taskAddResult.status)) {
                jobTasks.get(taskAddResult.taskId).state = JobTaskState.queued;
            } else {
                jobTasks.get(taskAddResult.taskId).state = JobTaskState.failed;
                jobTasks.get(taskAddResult.taskId).error = taskAddResult.error.message.value;
                this.logger.logError(`An error occurred while adding new task ${JSON.stringify(taskAddResult)} to the job ${jobId}.`);
            }
        });

        return Array.from(jobTasks.values());
    }

    private async getTaskAddParameter(
        jobId: string,
        taskId: string,
        messageText: string,
        sasUrl: string,
    ): Promise<BatchServiceModels.TaskAddParameter> {
        const taskParameter = await this.batchTaskParameterProvider.getTaskParameter(taskId, messageText);
        if (taskParameter === undefined) {
            return taskParameter;
        }

        if (!_.isNil(sasUrl)) {
            taskParameter.outputFiles = this.getOutFilesConfiguration(jobId, taskId, sasUrl);
        }

        return taskParameter;
    }

    private getOutFilesConfiguration(jobId: string, taskId: string, sasUrl: string): OutputFile[] {
        return [
            {
                filePattern: `../std*.txt`,
                destination: {
                    container: {
                        path: `${jobId}/${taskId}`,
                        containerUrl: sasUrl,
                    },
                },
                uploadOptions: { uploadCondition: 'taskcompletion' },
            },
        ];
    }
}
