// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTaskState, Message, PoolLoadGenerator, PoolLoadSnapshot, PoolMetricsInfo, Queue } from 'azure-services';
import { JobManagerConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { mergeWith } from 'lodash';
import { Logger } from 'logger';
import * as moment from 'moment';
import { BatchPoolLoadSnapshotProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { OnDemandPageScanResult, StorageDocument } from 'storage-documents';

// tslint:disable: no-unsafe-any no-any

export interface TaskArguments {
    id: string;
}

export interface ScanMessage {
    scanId: string;
    queueMessage: Message;
}

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
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
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
                    const acceptedScanMessages = await this.dropCompletedScans(scanMessages);
                    tasksQueuedCount = await this.addTasksToJob(acceptedScanMessages);
                }
            }

            // set the actual number of tasks added to the batch pool to process
            this.poolLoadGenerator.setLastTasksIncrementCount(tasksQueuedCount);

            this.logger.logInfo('Pool load statistics', mergeWith({}, poolLoadSnapshot, (t, s, k) =>
                s !== undefined ? (s.constructor.name !== 'Date' ? s.toString() : s.toJSON()) : 'undefined',
            ) as any);

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

        await this.completeTerminatedTasks();
    }

    private async completeTerminatedTasks(): Promise<void> {
        const failedTasks = await this.batch.getFailedTasks(this.batchConfig.jobId);
        if (failedTasks === undefined || failedTasks.length === 0) {
            this.logger.logInfo('No any job tasks has been terminated abnormally');

            return;
        }

        await Promise.all(
            failedTasks.map(async failedTask => {
                const taskArguments = JSON.parse(failedTask.taskArguments) as TaskArguments;
                if (taskArguments !== undefined && taskArguments.id !== undefined) {
                    let error = `Task was terminated unexpectedly. Exit code: ${failedTask.exitCode}`;
                    error =
                        failedTask.failureInfo !== undefined
                            ? `${error}, Error category: ${failedTask.failureInfo.category}, Error details: ${
                                  failedTask.failureInfo.message
                              }`
                            : error;

                    let pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(taskArguments.id);
                    if (pageScanResult !== undefined) {
                        if (pageScanResult.run.state !== 'failed') {
                            pageScanResult.run = {
                                state: 'failed',
                                timestamp: failedTask.timestamp.toJSON(),
                                error,
                            };
                            pageScanResult = await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
                        }
                    } else {
                        this.logger.logError(`Task has no corresponding state in a service storage`, {
                            taskProperties: JSON.stringify(failedTask),
                        });
                    }

                    this.logger.logError(error, { taskProperties: JSON.stringify(failedTask) });
                } else {
                    this.logger.logError(`Task has no run arguments defined`, { taskProperties: JSON.stringify(failedTask) });
                }
            }),
        );
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
        this.logger.logInfo(`Added ${jobQueuedTasks.length} new tasks`);

        return jobQueuedTasks.length;
    }

    private async dropCompletedScans(messages: Message[]): Promise<Message[]> {
        const scanMessages: ScanMessage[] = messages.map(message => ({
            scanId: (<TaskArguments>JSON.parse(message.messageText)).id,
            queueMessage: message,
        }));

        const scanRuns: OnDemandPageScanResult[] = [];
        const chunks = System.chunkArray(scanMessages, 100);
        await Promise.all(
            chunks.map(async chunk => {
                const scanIds = chunk.map(m => m.scanId);
                const runs = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);
                scanRuns.push(...runs);
            }),
        );

        const acceptedScanMessages: Message[] = [];
        await Promise.all(
            scanRuns.map(async scanRun => {
                const scanMessage = scanMessages.find(message => message.scanId === scanRun.id);
                if (scanRun.run.state === 'queued') {
                    acceptedScanMessages.push(scanMessage.queueMessage);
                } else {
                    await this.queue.deleteMessage(scanMessage.queueMessage);
                    this.logger.logWarn(
                        `The scan request with ID ${scanMessage.scanId} has been cancelled since run state has been changed to '${
                            scanRun.run.state
                        }'`,
                    );
                }
            }),
        );

        return acceptedScanMessages;
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
