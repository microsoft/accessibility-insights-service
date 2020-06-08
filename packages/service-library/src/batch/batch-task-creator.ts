// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Batch, BatchConfig, JobTask, JobTaskState, Message, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import * as moment from 'moment';

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
            throw new Error('[BatchTaskCreator] not initialized');
        }

        const restartAfterTime = moment().add(this.jobManagerConfig.maxWallClockTimeInHours, 'hour').toDate();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const messages = await this.getMessagesForTaskCreation();

            if (messages.length === 0 && !this.hasChildTasksRunning(await this.batch.getPoolMetricsInfo())) {
                this.logger.logInfo(`No new tasks added when there are no active/running tasks.`);
                break;
            } else if (messages.length > 0) {
                const jobTasks = await this.addTasksToJob(messages);

                await this.onTasksAdded(jobTasks);
            }

            if (moment().toDate() >= restartAfterTime) {
                this.logger.logInfo(`Performing scheduled termination after ${this.jobManagerConfig.maxWallClockTimeInHours} hours.`);
                break;
            }

            await this.system.wait(this.jobManagerConfig.addTasksIntervalInSeconds * 1000);
        }

        await this.waitForChildTasks();
        await this.onExit();
    }

    public async init(): Promise<void> {
        this.jobManagerConfig = await this.fetchJobManagerConfig();
        this.logger.setCustomProperties({
            batchJobId: this.batchConfig.jobId,
        });

        this.jobId = await this.batch.createJobIfNotExists(this.batchConfig.jobId, true);

        this.hasInitialized = true;
    }

    public abstract getQueueName(): string;

    protected abstract getMessagesForTaskCreation(): Promise<Message[]>;

    protected abstract onTasksAdded(tasks: JobTask[]): Promise<void>;

    protected abstract onExit(): Promise<void>;

    protected async waitForChildTasks(): Promise<void> {
        this.logger.logInfo('Waiting for child tasks to complete');

        let poolMetricsInfo: PoolMetricsInfo = await this.batch.getPoolMetricsInfo();
        while (this.hasChildTasksRunning(poolMetricsInfo)) {
            await this.system.wait(5000);
            poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        }
    }

    protected hasChildTasksRunning(poolMetricsInfo: PoolMetricsInfo): boolean {
        // The Batch service API may set activeTasks value instead of runningTasks value hence handle this case
        return this.getChildTasksCount(poolMetricsInfo) > 0;
    }

    protected getChildTasksCount(poolMetricsInfo: PoolMetricsInfo): number {
        const taskCount = poolMetricsInfo.load.activeTasks + poolMetricsInfo.load.runningTasks - 1;

        return taskCount < 0 ? 0 : taskCount;
    }

    protected async addTasksToJob(messages: Message[]): Promise<JobTask[]> {
        const jobTasks = await this.batch.createTasks(this.jobId, messages);

        await Promise.all(
            jobTasks.map(async (jobTask) => {
                if (jobTask.state === JobTaskState.queued) {
                    const message = messages.find((value) => value.messageId === jobTask.correlationId);
                    await this.queue.deleteMessage(this.getQueueName(), message);
                }
            }),
        );

        const jobQueuedTasks = jobTasks.filter((jobTask) => jobTask.state === JobTaskState.queued);
        this.logger.logInfo(`Added ${jobQueuedTasks.length} new tasks`);

        return jobQueuedTasks;
    }

    protected async fetchJobManagerConfig(): Promise<JobManagerConfig> {
        return this.serviceConfig.getConfigValue('jobManagerConfig');
    }
}
