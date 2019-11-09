// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
// tslint:disable-next-line: no-submodule-imports
import { OutputFile } from '@azure/batch/esm/models';
import { Message, StorageContainerSASUrlProvider } from 'azure-services';
import { ServiceConfiguration, System, TaskRuntimeConfig } from 'common';
import * as crypto from 'crypto';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Logger } from 'logger';
import * as moment from 'moment';
import { VError } from 'verror';
import { BatchServiceClientProvider, webApiJobManagerIocTypeNames } from '../web-api-job-manager-ioc-types';
import { BatchConfig } from './batch-config';
import { JobTask, JobTaskState } from './job-task';
import { PoolLoad, PoolMetricsInfo } from './pool-load-generator';
import { RunnerTaskConfig } from './runner-task-config';

@injectable()
export class Batch {
    public static readonly batchLogContainerName = 'batch-logs';

    public constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(BatchConfig) private readonly config: BatchConfig,
        @inject(RunnerTaskConfig) private readonly runnerTaskConfig: RunnerTaskConfig,
        @inject(webApiJobManagerIocTypeNames.BatchServiceClientProvider) private readonly batchClientProvider: BatchServiceClientProvider,
        @inject(Logger) private readonly logger: Logger,
        @inject(StorageContainerSASUrlProvider) private readonly containerSASUrlProvider: StorageContainerSASUrlProvider,
    ) {}

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

    public async createTasks(jobId: string, messages: Message[]): Promise<JobTask[]> {
        const tasks: JobTask[] = [];

        // Azure Batch supports the maximum 100 tasks to be added in addTaskCollection() API call
        const chunks = System.chunkArray(messages, 100);
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

    private async getActiveJobIds(): Promise<string[]> {
        const filterClause = `state eq 'active' and executionInfo/poolId eq '${this.config.poolId}'`;
        const options = {
            jobListOptions: { filter: filterClause },
        };

        const jobs = [];
        const client = await this.batchClientProvider();
        const jobListResponse = await client.job.list(options);
        jobs.push(...jobListResponse.values());

        let odatanextLink = jobListResponse.odatanextLink;
        while (odatanextLink !== undefined) {
            const jobListResponseNext = await client.job.listNext(odatanextLink, options);
            jobs.push(...jobListResponseNext.values());
            odatanextLink = jobListResponseNext.odatanextLink;
        }

        return jobs.map(i => i.id);
    }

    private async addTaskCollection(jobId: string, messages: Message[]): Promise<JobTask[]> {
        if (messages.length === 0) {
            return [];
        }

        const jobTasks: Map<string, JobTask> = new Map();
        const taskAddParameters: BatchServiceModels.TaskAddParameter[] = [];
        const maxTaskDurationInMinutes = (await this.getTaskConfig()).taskTimeoutInMinutes;
        let sasUrl: string;

        try {
            sasUrl = await this.containerSASUrlProvider.generateSASUrl(Batch.batchLogContainerName);
        } catch (error) {
            this.logger.logError(`encounter error while generating sas url ${error}`);
        }

        messages.forEach(message => {
            const jobTask = new JobTask(message.messageId);
            jobTasks.set(jobTask.id, jobTask);
            const taskAddParameter = this.getTaskAddParameter(jobId, jobTask.id, message.messageText, maxTaskDurationInMinutes, sasUrl);
            taskAddParameters.push(taskAddParameter);
        });

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

    private getTaskAddParameter(
        jobId: string,
        jobTaskId: string,
        messageText: string,
        maxTaskDurationInMinutes: number,
        sasUrl: string,
    ): BatchServiceModels.TaskAddParameter {
        const message = JSON.parse(messageText);
        const commandLine = this.runnerTaskConfig.getCommandLine(message);
        const taskParameter: BatchServiceModels.TaskAddParameter = {
            id: jobTaskId,
            commandLine: commandLine,
            resourceFiles: this.runnerTaskConfig.getResourceFiles(),
            environmentSettings: this.runnerTaskConfig.getEnvironmentSettings(),
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };

        if (!_.isNil(sasUrl)) {
            taskParameter.outputFiles = this.getOutFilesConfiguration(jobId, jobTaskId, sasUrl);
        }

        return taskParameter;
    }

    private getOutFilesConfiguration(jobId: string, jobTaskId: string, sasUrl: string): OutputFile[] {
        return [
            {
                filePattern: `../std*.txt`,
                destination: {
                    container: {
                        path: `${jobId}/${jobTaskId}`,
                        containerUrl: sasUrl,
                    },
                },
                uploadOptions: { uploadCondition: 'taskcompletion' },
            },
        ];
    }

    private async getTaskConfig(): Promise<TaskRuntimeConfig> {
        return this.serviceConfig.getConfigValue('taskConfig');
    }
}
