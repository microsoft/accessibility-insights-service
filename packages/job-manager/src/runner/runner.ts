// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Message, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as moment from 'moment';
import { Batch } from '../batch/batch';
import { JobTaskState } from '../batch/job-task';
import { PoolMetrics } from '../batch/pool-metrics';

@injectable()
export class Runner {
    public runOnce: boolean = false;

    private jobId: string;
    private jobManagerConfig: JobManagerConfig;
    private restartAfterTime: Date;

    public constructor(
        @inject(Batch) private readonly batch: Batch,
        @inject(Queue) private readonly queue: Queue,
        @inject(PoolMetrics) private readonly poolMetrics: PoolMetrics,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(): Promise<void> {
        await this.init();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
            const tasksIncrementCount = this.poolMetrics.getTasksIncrementCount(
                poolMetricsInfo,
                this.jobManagerConfig.targetQueuedTasksOverloadRatio,
            );

            let tasksQueuedCount = 0;
            if (tasksIncrementCount > 0) {
                const scanMessages = await this.getMessages(tasksIncrementCount);
                if (scanMessages.length === 0) {
                    this.logger.logInfo(`The storage queue '${this.queue.scanQueue}' has no message to process.`);

                    break;
                }

                tasksQueuedCount = await this.addTasksToJob(scanMessages);
            }

            this.poolMetrics.poolState.lastTasksIncrementCount = tasksQueuedCount;

            this.logger.logInfo('Pool load statistics', {
                activeTasks: poolMetricsInfo.load.activeTasks.toString(),
                runningTasks: poolMetricsInfo.load.runningTasks.toString(),
                pendingTasks: poolMetricsInfo.load.pendingTasks.toString(),
                processingSpeedTasksPerMinute: (
                    (60 / this.jobManagerConfig.tasksIncrementIntervalInSeconds) *
                    this.poolMetrics.poolState.processingSpeed
                ).toString(),
                tasksIncrementCountPerInterval: tasksIncrementCount.toString(),
                tasksIncrementIntervalInSeconds: this.jobManagerConfig.tasksIncrementIntervalInSeconds.toString(),
                tasksQueuedCountPerInterval: tasksQueuedCount.toString(),
            });

            if (this.runOnce) {
                break;
            }

            if (moment().toDate() > this.restartAfterTime) {
                this.logger.logInfo(`Performing scheduled restart after ${this.jobManagerConfig.periodicRestartInHours} hours.`);
                break;
            }

            // tslint:disable-next-line: no-string-based-set-timeout
            await new Promise(r => setTimeout(r, this.jobManagerConfig.tasksIncrementIntervalInSeconds * 1000));
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

    private async addTasksToJob(scanMessages: Message[]): Promise<number> {
        const jobTasks = await this.batch.createTasks(this.jobId, scanMessages);

        await Promise.all(
            jobTasks.map(async jobTask => {
                if (jobTask.state === JobTaskState.queued) {
                    const message = scanMessages.find(value => value.messageId === jobTask.correlationId);
                    await this.queue.deleteMessage(message);
                }
            }),
        );

        const jobQueuedTasks = jobTasks.filter(jobTask => jobTask.state === JobTaskState.queued);

        return jobQueuedTasks.length;
    }

    private async init(): Promise<void> {
        this.jobManagerConfig = await this.serviceConfig.getConfigValue('jobManagerConfig');
        this.jobId = await this.batch.createJobIfNotExists(process.env.AZ_BATCH_JOB_ID, true);
        this.restartAfterTime = moment()
            .add(this.jobManagerConfig.periodicRestartInHours, 'hour')
            .toDate();
    }
}
