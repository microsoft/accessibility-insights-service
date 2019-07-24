// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceModels } from '@azure/batch';
import { Message } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration } from 'common';
import * as crypto from 'crypto';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Logger } from 'logger';
import * as moment from 'moment';
import { VError } from 'verror';
import { BatchServiceClientProvider, jobManagerIocTypeNames } from '../job-manager-ioc-types';
import { BatchConfig } from './batch-config';
import { BatchMetricsResult } from './batch-metrics';
import { JobTask, JobTaskState } from './job-task';
import { RunnerTaskConfig } from './runner-task-config';

@injectable()
export class Batch {
    private readonly jobTasks: Map<string, JobTask> = new Map();

    public constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(BatchConfig) private readonly config: BatchConfig,
        @inject(RunnerTaskConfig) private readonly runnerTaskConfig: RunnerTaskConfig,
        @inject(jobManagerIocTypeNames.BatchServiceClientProvider) private readonly batchClientProvider: BatchServiceClientProvider,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async getBatchMetrics(): Promise<BatchMetricsResult> {
        const taskProcessingSamplingInterval = (await this.getJobManagerConfig()).taskProcessingSamplingIntervalInMinutes;

        const getBatchMetricsFormula = `
            $sampleTimeIntervalInMinutes = ${taskProcessingSamplingInterval} * TimeInterval_Minute;
            $pendingTasksVector = $PendingTasks.GetSample(TimeInterval_Minute, $sampleTimeIntervalInMinutes);
            $runningTasksVector = $RunningTasks.GetSample(TimeInterval_Minute, $sampleTimeIntervalInMinutes);
        `;

        const client = await this.batchClientProvider();
        const formulaEvaluationResult = await client.pool.evaluateAutoScale(this.config.poolId, getBatchMetricsFormula);

        const pendingTasksVector = formulaEvaluationResult.results.match(/.+?pendingTasksVector=\[([\d,]*)\]/)[1];
        const runningTasksVector = formulaEvaluationResult.results.match(/.+?runningTasksVector=\[([\d,]*)\]/)[1];

        return {
            poolId: this.config.poolId,
            timeIntervalInMinutes: taskProcessingSamplingInterval,
            pendingTasksVector: this.toArray(pendingTasksVector),
            runningTasksVector: this.toArray(runningTasksVector),
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
        // Azure Batch supports the maximum 100 tasks to add in collection
        const tasks: JobTask[] = [];

        let position = 0;
        let count = messages.length > 100 ? 100 : messages.length;
        do {
            const taskCollection = await this.addTaskCollection(jobId, messages.slice(position, position + count));
            tasks.push(...taskCollection);

            position = position + count;
            count = messages.length - position > 100 ? 100 : messages.length - position;
        } while (position < messages.length);

        return tasks;
    }

    private async addTaskCollection(jobId: string, messages: Message[]): Promise<JobTask[]> {
        if (messages.length === 0) {
            return [];
        }

        const taskAddParameters: BatchServiceModels.TaskAddParameter[] = [];
        const maxTaskDurationInMinutes = await this.getMaxTaskDurationInMinutes();

        messages.forEach(message => {
            const jobTask = new JobTask(message.messageId);
            this.jobTasks.set(jobTask.id, jobTask);
            const taskAddParameter = this.getTaskAddParameter(jobTask.id, message.messageText, maxTaskDurationInMinutes);
            taskAddParameters.push(taskAddParameter);
        });

        const client = await this.batchClientProvider();
        const taskAddCollectionResult = await client.task.addCollection(jobId, taskAddParameters);
        taskAddCollectionResult.value.forEach(taskAddResult => {
            if (/success/i.test(taskAddResult.status)) {
                this.jobTasks.get(taskAddResult.taskId).state = JobTaskState.queued;
                this.logger.logInfo(`New task ${taskAddResult.taskId} added to the job ${jobId}.`);
            } else {
                this.jobTasks.get(taskAddResult.taskId).state = JobTaskState.failed;
                this.jobTasks.get(taskAddResult.taskId).error = taskAddResult.error.message.value;
                this.logger.logError(`An error occurred while adding new task ${JSON.stringify(taskAddResult)} to the job ${jobId}.`);
            }
        });

        return Array.from(this.jobTasks.values());
    }

    private toArray(vector: string): number[] {
        return vector.split(',').map(i => +i);
    }

    private getTaskAddParameter(
        jobTaskId: string,
        messageText: string,
        maxTaskDurationInMinutes: number,
    ): BatchServiceModels.TaskAddParameter {
        const message = JSON.parse(messageText);
        const commandLine = this.runnerTaskConfig.getCommandLine(message);

        return {
            id: jobTaskId,
            commandLine: commandLine,
            resourceFiles: this.runnerTaskConfig.getResourceFiles(),
            environmentSettings: this.runnerTaskConfig.getEnvironmentSettings(),
            constraints: { maxWallClockTime: moment.duration({ minute: maxTaskDurationInMinutes }).toISOString() },
        };
    }

    private async getMaxTaskDurationInMinutes(): Promise<number> {
        const commonConfig = await this.serviceConfig.getConfigValue('taskConfig');

        return commonConfig.taskTimeoutInMinutes;
    }

    private async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
