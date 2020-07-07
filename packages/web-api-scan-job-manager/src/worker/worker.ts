// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, BatchConfig, JobTask, Message, PoolLoadGenerator, PoolLoadSnapshot, Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { isNil, mergeWith } from 'lodash';
import { GlobalLogger } from 'logger';
import * as moment from 'moment';
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
    protected scanMessages: ScanMessage[] = [];

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

        let messages: Message[] = [];

        if (poolLoadSnapshot.tasksIncrementCountPerInterval > 0) {
            messages = await this.queue.getMessagesWithTotalCount(this.getQueueName(), poolLoadSnapshot.tasksIncrementCountPerInterval);
            this.scanMessages = messages.map((message) => ({
                scanId: (<TaskArguments>JSON.parse(message.messageText)).id,
                queueMessage: message,
            }));

            messages = await this.excludeCompletedScans(this.scanMessages);
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

        return messages;
    }

    protected async onTasksAdded(tasks: JobTask[]): Promise<void> {
        this.poolLoadGenerator.setLastTasksIncrementCount(tasks.length);
    }

    protected async onTasksValidation(): Promise<void> {
        await this.validateTasks();
    }

    protected async onExit(): Promise<void> {
        await this.validateTasks();
    }

    private async validateTasks(): Promise<void> {
        await this.deleteScanQueueMessagesForSucceededTasks(this.scanMessages);
        await this.updateScanRunStateForTerminatedTasks();
    }

    private async deleteScanQueueMessagesForSucceededTasks(scanMessages: ScanMessage[]): Promise<void> {
        if (scanMessages.length === 0) {
            return;
        }

        const succeededTasks = await this.batch.getSucceededTasks(this.batchConfig.jobId);
        if (succeededTasks === undefined || succeededTasks.length === 0) {
            return;
        }

        await Promise.all(
            succeededTasks.map(async (succeededTask) => {
                const taskArguments = JSON.parse(succeededTask.taskArguments) as TaskArguments;
                if (!isNil(taskArguments?.id)) {
                    const scanMessage = scanMessages.find((message) => message.scanId === taskArguments.id);
                    await this.queue.deleteMessage(this.getQueueName(), scanMessage.queueMessage);
                } else {
                    this.logger.logError(`Unable to delete scan queue message. Task has no scan id run arguments defined.`, {
                        batchTaskId: succeededTask.id,
                        taskProperties: JSON.stringify(succeededTask),
                    });
                }
            }),
        );
    }

    private async updateScanRunStateForTerminatedTasks(): Promise<void> {
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

                    const pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(taskArguments.id);
                    if (pageScanResult !== undefined) {
                        if (pageScanResult.run.state !== 'failed') {
                            pageScanResult.run = {
                                state: 'failed',
                                timestamp: failedTask.timestamp.toJSON(),
                                error,
                            };
                            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
                        }
                    } else {
                        this.logger.logError(`Task has no corresponding state in a result storage.`, {
                            batchTaskId: failedTask.id,
                            taskProperties: JSON.stringify(failedTask),
                        });
                    }

                    this.logger.logError(error, { batchTaskId: failedTask.id, taskProperties: JSON.stringify(failedTask) });
                } else {
                    this.logger.logError(`Unable to update failed scan run result. Task has no scan id run arguments defined.`, {
                        batchTaskId: failedTask.id,
                        taskProperties: JSON.stringify(failedTask),
                    });
                }
            }),
        );
    }

    private async excludeCompletedScans(scanMessages: ScanMessage[]): Promise<Message[]> {
        if (scanMessages.length === 0) {
            return [];
        }

        const scanRuns: OnDemandPageScanResult[] = [];
        const chunks = this.system.chunkArray(scanMessages, 100);
        await Promise.all(
            chunks.map(async (chunk) => {
                const scanIds = chunk.map((m) => m.scanId);
                const runs = await this.onDemandPageScanRunResultProvider.readScanRuns(scanIds);
                scanRuns.push(...runs);
            }),
        );

        const messageVisibilityTimeout = (await this.getQueueConfig()).messageVisibilityTimeoutInSeconds;
        const acceptedScanMessages: Message[] = [];
        await Promise.all(
            scanRuns.map(async (scanRun) => {
                const scanMessage = scanMessages.find((message) => message.scanId === scanRun.id);
                if (
                    scanRun.run.state === 'queued' &&
                    moment.utc(scanRun.run.timestamp).add(messageVisibilityTimeout, 'second') > moment.utc()
                ) {
                    // Scan request just queued
                    acceptedScanMessages.push(scanMessage.queueMessage);
                } else if (scanRun.run.state === 'queued' || scanRun.run.state === 'running' || scanRun.run.state === 'failed') {
                    // Should include 'queued', 'running', and 'failed' states to retry abnormally terminated scan tasks
                    this.logger.logWarn(
                        'The scan request did not complete successfully during the last task run. Retrying scan with new task run.',
                        { scanId: scanRun.id, scanRunState: scanRun.run.state },
                    );
                    acceptedScanMessages.push(scanMessage.queueMessage);
                } else {
                    // Cancel scan request if current scan run state does not allow to retry scan task
                    await this.queue.deleteMessage(this.getQueueName(), scanMessage.queueMessage);
                    this.logger.logWarn(
                        `The scan request has been cancelled because current scan run state does not allow to retry scan task.`,
                        {
                            scanId: scanMessage.scanId,
                        },
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
