// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTask, JobTaskState, Message, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import * as moment from 'moment';
import { OnDemandScanRequestMessage } from 'storage-documents';

@injectable()
export abstract class BatchTaskCreator {
    protected jobManagerConfig: JobManagerConfig;
    protected jobId: string;
    private hasInitialized = false;

    public constructor(
        @inject(Batch) protected readonly batch: Batch,
        @inject(Queue) protected readonly queue: Queue,
        @inject(BatchConfig) protected readonly batchConfig: BatchConfig,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
        protected readonly system: typeof System = System,
    ) {}

    /**
     * The batch task may be retried when a task has failed.
     * Implement a task lock logic to prevent task reentrancy.
     */
    public async run(): Promise<void> {
        if (!this.hasInitialized) {
            throw new Error('The BatchTaskCreator instance is not initialized.');
        }

        const restartAfterTime = moment().add(this.jobManagerConfig.maxWallClockTimeInHours, 'hour').toDate();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const messages = await this.getMessagesForTaskCreation();

            if (messages.length === 0 && (await this.getJobPendingTasksCount()) === 0) {
                this.logger.logInfo(`No new scan messages being queued while all scan tasks were completed. Exiting job manager.`);

                break;
            } else if (messages.length > 0) {
                const jobTasks = await this.addTasksToJob(messages);
                await this.onTasksAdded(jobTasks);
            }

            if (moment().toDate() >= restartAfterTime) {
                this.logger.logInfo(
                    `Performing scheduled job manager termination after ${this.jobManagerConfig.maxWallClockTimeInHours} hours.`,
                );

                break;
            }

            await this.system.wait(this.jobManagerConfig.addTasksIntervalInSeconds * 1000);
        }

        await this.waitForChildTasks();
        await this.onExit();
    }

    public async init(): Promise<void> {
        this.jobManagerConfig = await this.fetchJobManagerConfig();
        this.jobId = await this.batch.createJobIfNotExists(this.batchConfig.jobId, true);
        this.hasInitialized = true;
    }

    public abstract getQueueName(): string;

    protected abstract getMessagesForTaskCreation(): Promise<Message[]>;

    protected abstract onTasksAdded(tasks: JobTask[]): Promise<void>;

    protected abstract onExit(): Promise<void>;

    protected async waitForChildTasks(): Promise<void> {
        this.logger.logInfo('Waiting for job tasks to complete.');
        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const pendingTasks = await this.getJobPendingTasksCount();
            if (pendingTasks > 0) {
                console.log(`Pending job tasks: ${pendingTasks}`);
                await this.system.wait(5000);
            } else {
                break;
            }
        }

        this.logger.logInfo('All job tasks are completed.');
    }

    protected async getJobPendingTasksCount(): Promise<number> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        const taskCount = poolMetricsInfo.load.activeTasks + poolMetricsInfo.load.runningTasks - 1; // exclude this job manager task

        return taskCount < 0 ? 0 : taskCount;
    }

    protected async addTasksToJob(messages: Message[]): Promise<JobTask[]> {
        const jobTasks = await this.batch.createTasks(this.jobId, messages);

        await Promise.all(
            jobTasks.map(async (jobTask) => {
                const message = messages.find((value) => value.messageId === jobTask.correlationId);
                const scanRequest = JSON.parse(message.messageText) as OnDemandScanRequestMessage;
                if (jobTask.state === JobTaskState.queued) {
                    await this.queue.deleteMessage(this.getQueueName(), message);
                    this.logger.logInfo('The scan task created successfully.', { scanId: scanRequest.id, scanTaskId: jobTask.id });
                } else {
                    this.logger.logError('Failure to create scan task.', {
                        scanId: scanRequest.id,
                        scanTaskId: jobTask.id,
                        scanTaskError: jobTask.error,
                        scanTaskState: jobTask.state,
                    });
                }
            }),
        );

        const jobQueuedTasks = jobTasks.filter((jobTask) => jobTask.state === JobTaskState.queued);
        this.logger.logInfo(`Added ${jobQueuedTasks.length} new scan tasks.`);

        return jobQueuedTasks;
    }

    protected async fetchJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
