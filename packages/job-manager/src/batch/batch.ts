// tslint:disable: no-submodule-imports
import { Message } from 'axis-storage';
import { ServiceClient } from 'azure-batch';
import { BatchError, CloudTaskListResult, TaskAddParameter } from 'azure-batch/lib/models';
import * as crypto from 'crypto';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as moment from 'moment';
import { VError } from 'verror';
import { BatchConfig } from './batch-config';
import { JobTask, JobTaskState } from './job-task';
import { TaskParameterBuilder } from './task-parameter-builder';

@injectable()
export class Batch {
    public static readonly MAX_TASK_DURATION: number = 10;
    private readonly jobTasks: Map<string, JobTask> = new Map();
    public constructor(
        @inject(BatchConfig) private readonly config: BatchConfig,
        @inject(TaskParameterBuilder) private readonly taskParameterBuilder: TaskParameterBuilder,
        @inject(ServiceClient.BatchServiceClient) private readonly batchClient: ServiceClient.BatchServiceClient,
    ) {}

    public async createJobIfNotExists(jobId: string, addJobIdIndexOnCreate: boolean = false): Promise<string> {
        let serviceJobId = jobId;
        await this.batchClient.job
            .get(serviceJobId)
            .then(cloudJob => {
                if (cloudJob.state !== 'active') {
                    throw new VError(`The job ${serviceJobId} is not active and cannot be use to run new tasks.`);
                }
            })
            .catch(async (error: BatchError) => {
                if (error.code === 'JobNotFound') {
                    if (addJobIdIndexOnCreate) {
                        serviceJobId = `${jobId}_${crypto.randomBytes(5).toString('hex')}`;
                    }

                    const jobAddParameter = {
                        id: serviceJobId,
                        poolInfo: {
                            poolId: this.config.poolId,
                        },
                        onAllTasksComplete: 'terminateJob',
                    };

                    await this.batchClient.job.add(jobAddParameter);
                    console.log(`[${new Date().toJSON()}] New job ${serviceJobId} created.`);
                } else {
                    throw new VError(error as Error, `An error occurred while retrieving state of ${jobId} job.`);
                }
            });

        return serviceJobId;
    }

    public async createTasks(jobId: string, messages: Message[]): Promise<JobTask[]> {
        const taskAddParameters: TaskAddParameter[] = [];

        messages.forEach(message => {
            const jobTask = new JobTask(message.messageId);
            this.jobTasks.set(jobTask.id, jobTask);
            const taskAddParameter = this.getTaskAddParameter(jobTask.id, message.messageText);
            taskAddParameters.push(taskAddParameter);
        });

        if (taskAddParameters.length > 0) {
            const taskAddCollectionResult = await this.batchClient.task.addCollection(jobId, taskAddParameters);
            taskAddCollectionResult.value.forEach(taskAddResult => {
                if (/success/i.test(taskAddResult.status)) {
                    this.jobTasks.get(taskAddResult.taskId).state = JobTaskState.queued;
                    console.log(`[${new Date().toJSON()}] New task ${taskAddResult.taskId} added to the job ${jobId}.`);
                } else {
                    this.jobTasks.get(taskAddResult.taskId).state = JobTaskState.failed;
                    this.jobTasks.get(taskAddResult.taskId).error = taskAddResult.error.message.value;
                    console.log(
                        `[${new Date().toJSON()}] An error occurred while adding new task ${taskAddResult.taskId} to the job ${jobId}.`,
                    );
                }
            });
        } else {
            console.log(`[${new Date().toJSON()}] No new tasks added to the job ${jobId}.`);
        }

        return Array.from(this.jobTasks.values());
    }

    public async waitJob(jobId: string, pullIntervalMilliseconds: number = 10000): Promise<void> {
        console.log(`[${new Date().toJSON()}] Waiting for job ${jobId} to complete.`);

        return new Promise(async (resolve, reject) => {
            const taskListOptions = {
                filter: `state ne '${JobTaskState.completed}'`,
            };
            const timerId = setInterval(async () => {
                await this.batchClient.task
                    .list(jobId, { taskListOptions: taskListOptions })
                    .then(async (result: CloudTaskListResult) => {
                        if (result.length === 0 || (result.length === 1 && result[0].id === process.env.AZ_BATCH_TASK_ID)) {
                            clearInterval(timerId);
                            console.log(`[${new Date().toJSON()}] Job ${jobId} completed.`);
                            resolve();
                        } else {
                            console.log(`[${new Date().toJSON()}] Job ${jobId} in progress with ${result.length} pending tasks.`);
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
        const cloudTaskListResult = await this.batchClient.task.list(jobId);
        this.setTasksState(cloudTaskListResult);
        let nextLink = cloudTaskListResult.odatanextLink;
        while (!_.isNil(nextLink)) {
            nextLink = await this.getTasksStateNext(nextLink);
        }

        return Array.from(this.jobTasks.values());
    }

    private async getTasksStateNext(nextPageLink: string): Promise<string> {
        if (!_.isNil(nextPageLink)) {
            const cloudTaskListResult = await this.batchClient.task.listNext(nextPageLink);
            this.setTasksState(cloudTaskListResult);

            return cloudTaskListResult.odatanextLink;
        }

        return undefined;
    }

    private setTasksState(cloudTaskList: ServiceClient.BatchServiceModels.CloudTaskListResult): void {
        cloudTaskList.forEach(task => {
            if (this.jobTasks.has(task.id)) {
                this.jobTasks.get(task.id).state = task.state;
                this.jobTasks.get(task.id).result = task.executionInfo.result;
                console.log(`[${new Date().toJSON()}] Task ${task.id} completed with ${task.executionInfo.result}`);
            }
        });
    }

    private getTaskAddParameter(jobTaskId: string, messageText: string): TaskAddParameter {
        const message = JSON.parse(messageText);
        const commandLine = this.taskParameterBuilder.getCommandLine(message);

        return {
            id: jobTaskId,
            commandLine: commandLine,
            resourceFiles: this.taskParameterBuilder.resourceFiles,
            environmentSettings: this.taskParameterBuilder.environmentSettings,
            constraints: { maxWallClockTime: moment.duration({ minute: Batch.MAX_TASK_DURATION }) },
        };
    }
}
