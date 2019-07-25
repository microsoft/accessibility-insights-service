// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Message, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { Batch } from '../batch/batch';
import { BatchMetrics } from '../batch/batch-metrics';
import { JobTaskState } from '../batch/job-task';

@injectable()
export class Runner {
    public runOnce: boolean = false;

    private jobId: string;
    private jobManagerConfig: JobManagerConfig;

    public constructor(
        @inject(Batch) private readonly batch: Batch,
        @inject(Queue) private readonly queue: Queue,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(): Promise<void> {
        await this.init();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const batchMetricsResult = await this.batch.getBatchMetrics();
            const batchMetrics = new BatchMetrics(batchMetricsResult);

            if (batchMetrics.taskProcessingRatio !== -1) {
                this.logger.logInfo(
                    `The pool '${batchMetricsResult.poolId}' tasks processing ratio is ${batchMetrics.taskProcessingRatio}.`,
                );
            } else {
                this.logger.logInfo(`The pool '${batchMetricsResult.poolId}' tasks processing ratio is not available.`);
            }

            const taskIncrementCount =
                batchMetrics.taskProcessingRatio !== -1
                    ? batchMetrics.getPendingTaskIncrementCount(this.jobManagerConfig.maxTaskProcessingRatio)
                    : this.jobManagerConfig.taskIncrementCount;

            if (
                batchMetrics.taskProcessingRatio >= this.jobManagerConfig.minTaskProcessingRatio ||
                batchMetrics.taskProcessingRatio === -1
            ) {
                const scanMessages = await this.getMessages(taskIncrementCount);
                if (scanMessages.length === 0) {
                    this.logger.logInfo(
                        `The storage queue '${this.queue.scanQueue}' has no message to process. No tasks added to the job '${this.jobId}'.`,
                    );

                    break;
                }

                await this.addTasksToJob(scanMessages);
            }

            if (this.runOnce) {
                break;
            }

            // tslint:disable-next-line: no-string-based-set-timeout
            await new Promise(r => setTimeout(r, this.jobManagerConfig.taskIncrementIntervalInSeconds));
        }
    }

    private async getMessages(messagesCount: number): Promise<Message[]> {
        const messages: Message[] = [];
        do {
            const batch = await this.queue.getMessages();
            if (batch.length === 0) {
                break;
            }
            messages.push(...batch);
        } while (messages.length < messagesCount);

        return messages;
    }

    private async addTasksToJob(scanMessages: Message[]): Promise<void> {
        const jobTasks = await this.batch.createTasks(this.jobId, scanMessages);

        jobTasks.forEach(async jobTask => {
            if (jobTask.state === JobTaskState.queued) {
                const message = scanMessages.find(value => value.messageId === jobTask.correlationId);
                await this.queue.deleteMessage(message);
            }
        });

        const jobTasksQueuedCount = jobTasks.filter(jobTask => jobTask.state === JobTaskState.queued);
        this.logger.logInfo(`Successfully added '${jobTasksQueuedCount}' of ${jobTasks.length} tasks to the job '${this.jobId}'.`);
    }

    private async init(): Promise<void> {
        this.jobManagerConfig = await this.serviceConfig.getConfigValue('jobManagerConfig');
        this.jobId = await this.batch.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true);
    }
}
