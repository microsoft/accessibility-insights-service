// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTask, Message, PoolLoadGenerator, PoolLoadSnapshot, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { isNil, mergeWith } from 'lodash';
import { GlobalLogger } from 'logger';
import { BatchPoolLoadSnapshotProvider, BatchTaskCreator, OnDemandPageScanRunResultProvider } from 'service-library';
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
export class Worker extends BatchTaskCreator {
    public constructor(
        @inject(Batch) batch: Batch,
        @inject(Queue) queue: Queue,
        @inject(PoolLoadGenerator) private readonly poolLoadGenerator: PoolLoadGenerator,
        @inject(BatchPoolLoadSnapshotProvider) private readonly batchPoolLoadSnapshotProvider: BatchPoolLoadSnapshotProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(BatchConfig) batchConfig: BatchConfig,
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(GlobalLogger) logger: GlobalLogger,
        system: typeof System = System,
    ) {
        super(batch, queue, batchConfig, serviceConfig, logger, system);
    }

    public getQueueName(): string {
        return this.storageConfig.scanQueue;
    }

    protected async getMessagesForTaskCreation(): Promise<Message[]> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        const poolLoadSnapshot = await this.poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        await this.writePoolLoadSnapshot(poolLoadSnapshot);

        let scanMessages: Message[] = [];

        if (poolLoadSnapshot.tasksIncrementCountPerInterval > 0) {
            scanMessages = await this.queue.getMessagesWithTotalCount(this.getQueueName(), poolLoadSnapshot.tasksIncrementCountPerInterval);

            if (scanMessages.length > 0) {
                scanMessages = await this.dropCompletedScans(scanMessages);
            }
        }

        this.logger.logInfo(
            'Pool load statistics',
            mergeWith({}, poolLoadSnapshot, (t, s) =>
                s !== undefined ? (s.constructor.name !== 'Date' ? s.toString() : s.toJSON()) : 'undefined',
            ) as any,
        );

        // tslint:disable-next-line: no-null-keyword
        this.logger.trackEvent('BatchPoolStats', null, {
            runningTasks: poolMetricsInfo.load.runningTasks,
            samplingIntervalInSeconds: poolLoadSnapshot.samplingIntervalInSeconds,
            maxParallelTasks: poolMetricsInfo.maxTasksPerPool,
        });

        return scanMessages;
    }

    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {
        this.poolLoadGenerator.setLastTasksIncrementCount(tasks.length);
    }

    protected async onExit(): Promise<void> {
        await this.completeTerminatedTasks();
    }

    private async completeTerminatedTasks(): Promise<void> {
        const failedTasks = await this.batch.getFailedTasks(this.batchConfig.jobId);
        if (failedTasks === undefined || failedTasks.length === 0) {
            return;
        }

        await Promise.all(
            failedTasks.map(async (failedTask) => {
                const taskArguments = JSON.parse(failedTask.taskArguments) as TaskArguments;
                if (!isNil(taskArguments?.id)) {
                    let error = `Task was terminated unexpectedly. Exit code: ${failedTask.exitCode}`;
                    error =
                        failedTask.failureInfo !== undefined
                            ? // tslint:disable-next-line:max-line-length
                              `${error}, Error category: ${failedTask.failureInfo.category}, Error details: ${failedTask.failureInfo.message}`
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

    private async dropCompletedScans(messages: Message[]): Promise<Message[]> {
        const scanMessages: ScanMessage[] = messages.map((message) => ({
            scanId: (<TaskArguments>JSON.parse(message.messageText)).id,
            queueMessage: message,
        }));

        const scanRuns: OnDemandPageScanResult[] = [];
        const chunks = this.system.chunkArray(scanMessages, 100);
        await Promise.all(
            chunks.map(async (chunk) => {
                const scanIds = chunk.map((m) => m.scanId);
                const runs = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);
                scanRuns.push(...runs);
            }),
        );

        const acceptedScanMessages: Message[] = [];
        await Promise.all(
            scanRuns.map(async (scanRun) => {
                const scanMessage = scanMessages.find((message) => message.scanId === scanRun.id);
                if (scanRun.run.state === 'queued') {
                    acceptedScanMessages.push(scanMessage.queueMessage);
                } else {
                    await this.queue.deleteMessage(this.getQueueName(), scanMessage.queueMessage);
                    this.logger.logWarn(
                        // tslint:disable-next-line:max-line-length
                        `The scan request with ID ${scanMessage.scanId} has been cancelled since run state has been changed to '${scanRun.run.state}'`,
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
}
