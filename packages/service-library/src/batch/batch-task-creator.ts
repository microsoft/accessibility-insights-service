// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, BatchTask, JobTask, JobTaskState, Message, Queue } from 'azure-services';
import { JobManagerConfig, QueueRuntimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import * as moment from 'moment';

// tslint:disable: no-unsafe-any

export interface ScanMessage {
    scanId: string;
    messageId: string;
    message: Message;
}

export interface BatchTaskCreator {
    getMessagesForTaskCreation(): Promise<ScanMessage[]>;
    onTasksAdded?(tasks: JobTask[]): Promise<void>;
    handleFailedTasks?(failedTasks: BatchTask[]): Promise<void>;
    onExit?(): Promise<void>;
}

@injectable()
export abstract class BatchTaskCreator {
    protected jobManagerConfig: JobManagerConfig;
    protected jobId: string;
    protected activeScanMessages: ScanMessage[];

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

        this.activeScanMessages = [];
        const restartAfterTime = moment().add(this.jobManagerConfig.maxWallClockTimeInHours, 'hour').toDate();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const messages = await this.getMessagesForTaskCreation();
            if (messages.length === 0 && (await this.getJobPendingTasksCount()) === 0) {
                this.logger.logInfo(`All tasks are completed and no new scan requests available. Exiting the job manager.`);

                break;
            } else if (messages.length > 0) {
                this.activeScanMessages.push(...messages);
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

            await this.validateTasks();
        }

        await this.waitForChildTasks();
        await this.validateTasks();
        await this.onExit();
    }

    public async init(): Promise<void> {
        this.jobManagerConfig = await this.getJobManagerConfig();
        this.jobId = await this.batch.createJobIfNotExists(this.batchConfig.jobId, true);
        this.hasInitialized = true;
    }

    public abstract getQueueName(): string;

    protected async waitForChildTasks(): Promise<void> {
        this.logger.logInfo('Waiting for job tasks to complete.');
        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const pendingTasks = await this.getJobPendingTasksCount();
            if (pendingTasks > 0) {
                this.logger.logInfo(`Pending job tasks: ${pendingTasks}.`);
                await this.system.wait(5000);
            } else {
                break;
            }
        }

        this.logger.logInfo('All job tasks are completed.');
    }

    protected async getJobPendingTasksCount(): Promise<number> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        const taskCount = poolMetricsInfo.load.activeTasks + poolMetricsInfo.load.runningTasks - 1; // exclude the job manager task

        return taskCount < 0 ? 0 : taskCount;
    }

    protected async addTasksToJob(messages: ScanMessage[]): Promise<JobTask[]> {
        const jobTasks = await this.batch.createTasks(
            this.jobId,
            messages.map((m) => m.message),
        );

        await Promise.all(
            jobTasks.map(async (jobTask) => {
                const scanMessage = this.activeScanMessages.find((m) => m.messageId === jobTask.correlationId);
                if (jobTask.state === JobTaskState.queued) {
                    this.logger.logInfo('The scan task created successfully.', { scanId: scanMessage.scanId, scanTaskId: jobTask.id });
                } else {
                    this.activeScanMessages.splice(this.activeScanMessages.indexOf(scanMessage), 1);
                    this.logger.logError('Failure to create scan task.', {
                        scanId: scanMessage.scanId,
                        scanTaskId: jobTask.id,
                        scanTaskError: jobTask.error,
                        scanTaskState: jobTask.state,
                    });
                }
            }),
        );

        const queuedJobTasks = jobTasks.filter((jobTask) => jobTask.state === JobTaskState.queued);
        this.logger.logInfo(`Added ${queuedJobTasks.length} new scan tasks to the job.`);

        return queuedJobTasks;
    }

    protected async getJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }

    protected async getQueueConfig(): Promise<QueueRuntimeConfig> {
        return this.serviceConfig.getConfigValue('queueConfig');
    }

    protected async validateTasks(): Promise<void> {
        await this.deleteScanQueueMessagesForSucceededTasks(this.activeScanMessages);
        await this.handleFailedTasksImpl();
    }

    protected async deleteScanQueueMessagesForSucceededTasks(scanMessages: ScanMessage[]): Promise<void> {
        if (scanMessages.length === 0) {
            return;
        }

        const succeededTasks = await this.batch.getSucceededTasks(this.batchConfig.jobId);
        if (succeededTasks === undefined || succeededTasks.length === 0) {
            return;
        }

        // select tasks that match to the current active tasks list
        const unprocessedTasks = succeededTasks.filter((task) => this.activeScanMessages.some((m) => m.messageId === task.correlationId));
        await Promise.all(
            unprocessedTasks.map(async (task) => {
                const scanMessage = this.activeScanMessages.find((m) => m.messageId === task.correlationId);
                await this.queue.deleteMessage(this.getQueueName(), scanMessage.message);
                // remove processed task from the current active tasks list
                this.activeScanMessages.splice(this.activeScanMessages.indexOf(scanMessage), 1);
                this.logger.logInfo('The scan request deleted from the scan task queue.', {
                    scanId: scanMessage.scanId,
                    correlatedBatchTaskId: task.id,
                });
            }),
        );
    }

    private async handleFailedTasksImpl(): Promise<void> {
        const failedTasks = await this.batch.getFailedTasks(this.batchConfig.jobId);
        if (failedTasks === undefined || failedTasks.length === 0) {
            return;
        }

        // select tasks that match to the current active tasks list
        const unprocessedTasks = failedTasks.filter((task) => this.activeScanMessages.some((m) => m.messageId === task.correlationId));
        await this.handleFailedTasks(unprocessedTasks);

        // remove processed tasks from the current active tasks list
        unprocessedTasks.map((task) => {
            const message = this.activeScanMessages.find((m) => m.messageId === task.correlationId);
            this.activeScanMessages.splice(this.activeScanMessages.indexOf(message), 1);
        });
    }
}
