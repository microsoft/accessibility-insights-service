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
import { JobTask, JobTaskState } from './job-task';
import { RunnerTaskConfig } from './runner-task-config';

// tslint:disable: max-line-length

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

    public async getPoolTaskProcessingRatio(): Promise<number> {
        const resultVariableName = 'taskProcessingRatioResult';
        const poolTaskProcessingRatioFormula = `
        // The script will calculate the tasks processing ratio returned in $taskProcessingRatio variable as
        // double value and will return -1 when there are no active tasks or sampling data is insufficient

        // the time interval for data sampling
        $sampleTimeIntervalMinutes = 15 * TimeInterval_Minute;
        $samplePercentThreshold = 70;

        // get sample data for pending tasks (the sum of active and running tasks)
        $pendingTasksSamplePercent = $PendingTasks.GetSamplePercent($sampleTimeIntervalMinutes);
        $pendingTasksVector = $PendingTasks.GetSample(TimeInterval_Minute, $sampleTimeIntervalMinutes);
        $pendingTasksAvg = avg($pendingTasksVector);

        // get sample data for running tasks
        $runningTasksSamplePercent = $RunningTasks.GetSamplePercent($sampleTimeIntervalMinutes);
        $runningTasksVector = $RunningTasks.GetSample(TimeInterval_Minute, $sampleTimeIntervalMinutes);
        $runningTasksAvg = avg($runningTasksVector);

        // calculate the tasks processing ratio
        $taskProcessingRatio = $runningTasksAvg / ($pendingTasksAvg > 0 ? $pendingTasksAvg : 1);

        // set the tasks processing ratio for case when there are no active tasks (no processing)
        $taskProcessingRatio = $pendingTasksAvg > 0 ? $taskProcessingRatio : -1;

        // skip data sampling when sample percent is low
        $${resultVariableName} = ($pendingTasksSamplePercent < $samplePercentThreshold || $runningTasksSamplePercent < $samplePercentThreshold) ? -1 : $taskProcessingRatio;
        `;

        const client = await this.batchClientProvider();
        const formulaEvaluationResult = await client.pool.evaluateAutoScale(this.config.poolId, poolTaskProcessingRatioFormula);

        // we need to escape the escaping \ in the regex string
        const regExp = new RegExp(`.+?${resultVariableName}=(-?\\d+\\.?\\d*);?`, 'g');
        const regExpMatch = regExp.exec(formulaEvaluationResult.results);
        if (regExpMatch === null || regExpMatch.length < 2) {
            throw new Error(
                `The tasks processing ratio formula evaluation result has no expected variable '${resultVariableName}' returned.`,
            );
        }

        const taskProcessingRatio = +regExpMatch[1];
        this.logger.logInfo(`The pool ${this.config.poolId} tasks processing ratio is ${taskProcessingRatio}.`);

        return taskProcessingRatio;
    }

    public async isPoolOverloaded(): Promise<boolean> {
        const maxPoolTaskProcessingRatio = (await this.getJobManagerConfig()).maxPoolTaskProcessingRatio;
        const taskProcessingRatio = await this.getPoolTaskProcessingRatio();

        return taskProcessingRatio <= maxPoolTaskProcessingRatio;
    }

    public async createJobIfNotExists(jobId: string, addJobIdIndexOnCreate: boolean = false): Promise<string> {
        let serviceJobId = jobId;
        const client = await this.batchClientProvider();

        await client.job
            .get(serviceJobId)
            .then(cloudJob => {
                if (cloudJob.state !== 'active') {
                    throw new VError(`The job ${serviceJobId} is not active and cannot be use to run new tasks.`);
                }
            })
            .catch(async (error: BatchServiceModels.BatchError) => {
                if (error.code === 'JobNotFound') {
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
            });

        return serviceJobId;
    }

    public async createTasks(jobId: string, messages: Message[]): Promise<JobTask[]> {
        const taskAddParameters: BatchServiceModels.TaskAddParameter[] = [];
        const maxTaskDurationInMinutes = await this.getMaxTaskDurationInMinutes();

        messages.forEach(message => {
            const jobTask = new JobTask(message.messageId);
            this.jobTasks.set(jobTask.id, jobTask);
            const taskAddParameter = this.getTaskAddParameter(jobTask.id, message.messageText, maxTaskDurationInMinutes);
            taskAddParameters.push(taskAddParameter);
        });

        if (taskAddParameters.length > 0) {
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
        } else {
            this.logger.logInfo(`No new tasks added to the job ${jobId}.`);
        }

        return Array.from(this.jobTasks.values());
    }

    public async waitJob(jobId: string, pullIntervalMilliseconds: number = 10000): Promise<void> {
        this.logger.logInfo(`Waiting for job ${jobId} to complete.`);
        const client = await this.batchClientProvider();

        return new Promise(async (resolve, reject) => {
            const taskListOptions = {
                filter: `state ne '${JobTaskState.completed}'`,
            };
            const timerId = setInterval(async () => {
                await client.task
                    .list(jobId, { taskListOptions: taskListOptions })
                    .then(async (result: BatchServiceModels.CloudTaskListResult) => {
                        if (result.length === 0 || (result.length === 1 && result[0].id === process.env.AZ_BATCH_TASK_ID)) {
                            clearInterval(timerId);
                            this.logger.logInfo(`Job ${jobId} completed.`);
                            resolve();
                        } else {
                            this.logger.logInfo(`Job ${jobId} in progress with ${result.length} pending tasks.`);
                        }
                    })
                    .catch((error: Error) => {
                        clearInterval(timerId);
                        reject(new VError(error, `An error occurred while retrieving the task list for the job ${jobId}`));
                    });
                // tslint:disable-next-line: align
            }, pullIntervalMilliseconds);
        });
    }

    public async getCreatedTasksState(jobId: string): Promise<JobTask[]> {
        const client = await this.batchClientProvider();
        const cloudTaskListResult = await client.task.list(jobId);
        this.setTasksState(cloudTaskListResult);
        let nextLink = cloudTaskListResult.odatanextLink;
        while (!_.isNil(nextLink)) {
            nextLink = await this.getTasksStateNext(nextLink);
        }

        return Array.from(this.jobTasks.values());
    }

    private async getTasksStateNext(nextPageLink: string): Promise<string> {
        if (!_.isNil(nextPageLink)) {
            const client = await this.batchClientProvider();
            const cloudTaskListResult = await client.task.listNext(nextPageLink);
            this.setTasksState(cloudTaskListResult);

            return cloudTaskListResult.odatanextLink;
        }

        return undefined;
    }

    private setTasksState(cloudTaskList: BatchServiceModels.CloudTaskListResult): void {
        cloudTaskList.forEach(task => {
            if (this.jobTasks.has(task.id)) {
                this.jobTasks.get(task.id).state = task.state;
                this.jobTasks.get(task.id).result = task.executionInfo.result;
                this.logger.logInfo(`Task ${task.id} completed with ${task.executionInfo.result}`);
            }
        });
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
