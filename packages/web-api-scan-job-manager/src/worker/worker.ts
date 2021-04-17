// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Batch, BatchConfig, BatchTask, JobTask, Message, PoolLoadGenerator, PoolLoadSnapshot, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { isNil, mergeWith } from 'lodash';
import { GlobalLogger } from 'logger';
import { BatchPoolLoadSnapshotProvider, BatchTaskCreator, OnDemandPageScanRunResultProvider, ScanMessage } from 'service-library';
import { OnDemandScanRequestMessage, StorageDocument } from 'storage-documents';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo();
        const poolLoadSnapshot = await this.poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        await this.writePoolLoadSnapshot(poolLoadSnapshot);

        let messages: ScanMessage[] = [];
        const queueName = this.getQueueName();
        if (poolLoadSnapshot.tasksIncrementCountPerInterval > 0) {
            const queueMessages = await this.queue.getMessagesWithTotalCount(queueName, poolLoadSnapshot.tasksIncrementCountPerInterval);
            if (queueMessages?.length > 0) {
                messages = this.convertToScanMessages(queueMessages);
            }
        }

        this.logger.logInfo(
            'Pool load statistics',
            mergeWith({}, poolLoadSnapshot, (t, s) =>
                s !== undefined ? (s.constructor.name !== 'Date' ? s.toString() : s.toJSON()) : 'undefined',
            ) as any,
        );

        this.logger.trackEvent('BatchPoolStats', null, {
            runningTasks: poolMetricsInfo.load.runningTasks,
            samplingIntervalInSeconds: poolLoadSnapshot.samplingIntervalInSeconds,
            maxParallelTasks: poolMetricsInfo.maxTasksPerPool,
        });

        return messages;
    }

    public async onTasksAdded(tasks: JobTask[]): Promise<void> {
        this.poolLoadGenerator.setLastTasksIncrementCount(tasks.length);
    }

    public async handleFailedTasks(failedTasks: BatchTask[]): Promise<void> {
        await Promise.all(
            failedTasks.map(async (failedTask) => {
                const taskArguments = JSON.parse(failedTask.taskArguments) as OnDemandScanRequestMessage;
                if (!isNil(taskArguments?.id)) {
                    let error = `Task was terminated unexpectedly. Exit code: ${failedTask.exitCode}`;
                    error =
                        failedTask.failureInfo !== undefined
                            ? // eslint-disable-next-line max-len
                              `${error}, Error category: ${failedTask.failureInfo.category}, Error details: ${failedTask.failureInfo.message}`
                            : error;

                    const pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(taskArguments.id);
                    if (pageScanResult !== undefined) {
                        pageScanResult.run = {
                            state: 'failed',
                            timestamp: failedTask.timestamp.toJSON(),
                            error,
                        };
                        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
                    } else {
                        this.logger.logError(`Unable to find corresponding scan document in a result storage.`, {
                            correlatedBatchTaskId: failedTask.id,
                            taskProperties: JSON.stringify(failedTask),
                        });
                    }

                    this.logger.logError(error, { correlatedBatchTaskId: failedTask.id, taskProperties: JSON.stringify(failedTask) });
                } else {
                    this.logger.logError(`Unable to update failed scan run result. Task has no scan id run arguments defined.`, {
                        correlatedBatchTaskId: failedTask.id,
                        taskProperties: JSON.stringify(failedTask),
                    });
                }
            }),
        );
    }

    private async writePoolLoadSnapshot(poolLoadSnapshot: PoolLoadSnapshot): Promise<void> {
        await this.batchPoolLoadSnapshotProvider.writeBatchPoolLoadSnapshot({
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            ...({} as StorageDocument),
            batchAccountName: this.batchConfig.accountName,
            ...poolLoadSnapshot,
        });
    }

    private convertToScanMessages(messages: Message[]): ScanMessage[] {
        return messages.map((message) => {
            return {
                scanId: this.parseMessageBody(message).id,
                messageId: message.messageId,
                message: message,
            };
        });
    }

    private parseMessageBody(message: Message): OnDemandScanRequestMessage {
        return message.messageText === undefined ? undefined : (JSON.parse(message.messageText) as OnDemandScanRequestMessage);
    }
}
