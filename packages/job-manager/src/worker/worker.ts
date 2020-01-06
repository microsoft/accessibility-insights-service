// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Message, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as moment from 'moment';
import { Batch } from '../batch/batch';
import { JobTaskState } from '../batch/job-task';
import { PoolLoadGenerator } from '../batch/pool-load-generator';

@injectable()
export class Worker {
    public runOnce: boolean = false;

    private jobId: string;
    private jobManagerConfig: JobManagerConfig;
    private restartAfterTime: Date;

    public constructor(
        @inject(Batch) private readonly batch: Batch,
        @inject(Queue) private readonly queue: Queue,
        @inject(PoolLoadGenerator) private readonly poolLoadGenerator: PoolLoadGenerator,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
        private readonly system: typeof System = System,
    ) {}

    public async run(): Promise<void> {
        await this.init();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
            const tasksIncrementCount = await this.poolLoadGenerator.getTasksIncrementCount(poolMetricsInfo);

            let tasksQueuedCount = 0;
            if (tasksIncrementCount > 0) {
                const scanMessages = await this.getMessages(tasksIncrementCount);
                if (scanMessages.length === 0) {
                    this.logger.logInfo(`The storage queue '${this.queue.scanQueue}' has no message to process.`);
                    if (this.hasChildTasksRunning(poolMetricsInfo) === false) {
                        this.logger.logInfo(`Exiting the ${this.jobId} job since there are no active/running tasks.`);
                        break;
                    }
                }

                if (scanMessages.length > 0) {
                    tasksQueuedCount = await this.addTasksToJob(scanMessages);
                }
            }

            this.poolLoadGenerator.setLastTasksIncrementCount(tasksQueuedCount);

            this.logger.logInfo('Pool load statistics', {
                activeTasks: poolMetricsInfo.load.activeTasks.toString(),
                runningTasks: poolMetricsInfo.load.runningTasks.toString(),
                requestedTasksToAddPerInterval: tasksIncrementCount.toString(),
                tasksAddedPerInterval: tasksQueuedCount.toString(),
                samplingIntervalInSeconds: this.poolLoadGenerator.samplingIntervalInSeconds.toString(),
                processingSpeedTasksPerMinute: this.poolLoadGenerator.processingSpeedPerMinute.toString(),
                activeToRunningTasksRatio: this.poolLoadGenerator.activeToRunningTasksRatio.toString(),
            });

            if (this.runOnce) {
                break;
            }

            if (moment().toDate() >= this.restartAfterTime) {
                this.logger.logInfo(`Performing scheduled termination after ${this.jobManagerConfig.maxWallClockTimeInHours} hours.`);
                await this.waitForChildTasks();
                break;
            }

            await this.system.wait(this.jobManagerConfig.addTasksIntervalInSeconds * 1000);
        }
    }

    private async waitForChildTasks(): Promise<void> {
        this.logger.logInfo('Waiting for child tasks to complete');

        let poolMetricsInfo: PoolMetricsInfo = await this.batch.getPoolMetricsInfo();

        while (this.hasChildTasksRunning(poolMetricsInfo)) {
            await this.system.wait(5000);
            poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        }
    }

    private hasChildTasksRunning(poolMetricsInfo: PoolMetricsInfo): boolean {
        // The Batch service API may set activeTasks value instead of runningTasks value hence handle this case
        return poolMetricsInfo.load.activeTasks + poolMetricsInfo.load.runningTasks > 1;
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
            .add(this.jobManagerConfig.maxWallClockTimeInHours, 'hour')
            .toDate();
    }
}
