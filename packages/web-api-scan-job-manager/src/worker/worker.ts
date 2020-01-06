// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTaskState, Message, PoolLoadGenerator, PoolLoadSnapshot, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { cloneDeepWith } from 'lodash';
import { Logger } from 'logger';
import * as moment from 'moment';
import { BatchPoolLoadSnapshotProvider } from 'service-library';
import { StorageDocument } from 'storage-documents';

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
        @inject(BatchPoolLoadSnapshotProvider) private readonly batchPoolLoadSnapshotProvider: BatchPoolLoadSnapshotProvider,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
        private readonly system: typeof System = System,
    ) {}

    public async run(): Promise<void> {
        await this.init();

        // tslint:disable-next-line: no-constant-condition
        while (true) {
            const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
            const poolLoadSnapshot = await this.poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
            await this.writePoolLoadSnapshot(poolLoadSnapshot);

            let tasksQueuedCount = 0;
            if (poolLoadSnapshot.tasksIncrementCountPerInterval > 0) {
                const scanMessages = await this.getMessages(poolLoadSnapshot.tasksIncrementCountPerInterval);
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

            // set the actual number of tasks added to the batch pool to process
            this.poolLoadGenerator.setLastTasksIncrementCount(tasksQueuedCount);

            this.logger.logInfo(
                'Pool load statistics',
                // tslint:disable-next-line: no-unsafe-any
                cloneDeepWith(poolLoadSnapshot, value => (value !== undefined ? value.toString() : 'undefined')),
            );

            // tslint:disable-next-line: no-null-keyword
            this.logger.trackEvent('BatchPoolStats', null, {
                runningTasks: poolMetricsInfo.load.runningTasks,
                samplingIntervalInSeconds: poolLoadSnapshot.samplingIntervalInSeconds,
                maxParallelTasks: poolMetricsInfo.maxTasksPerPool,
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

    private async writePoolLoadSnapshot(poolLoadSnapshot: PoolLoadSnapshot): Promise<void> {
        await this.batchPoolLoadSnapshotProvider.writeBatchPoolLoadSnapshot({
            // tslint:disable-next-line: no-object-literal-type-assertion
            ...({} as StorageDocument),
            batchAccountName: this.batchConfig.accountName,
            ...poolLoadSnapshot,
        });
    }

    private async init(): Promise<void> {
        this.jobManagerConfig = await this.serviceConfig.getConfigValue('jobManagerConfig');
        this.jobId = await this.batch.createJobIfNotExists(this.batchConfig.jobId, true);
        this.restartAfterTime = moment()
            .add(this.jobManagerConfig.maxWallClockTimeInHours, 'hour')
            .toDate();
    }
}
