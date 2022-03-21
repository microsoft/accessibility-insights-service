// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    Batch,
    BatchConfig,
    BatchTask,
    JobTask,
    PoolLoadGenerator,
    PoolLoadSnapshot,
    client,
    CosmosOperationResponse,
} from 'azure-services';
import { System, GuidGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { mergeWith, isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import {
    BatchPoolLoadSnapshotProvider,
    BatchTaskCreator,
    ScanMessage,
    ReportGeneratorRequestProvider,
    ScanReportGroup,
} from 'service-library';
import { StorageDocument, TargetReport } from 'storage-documents';

export interface BatchTaskArguments {
    id: string;
    scanGroupId: string;
    targetReport: TargetReport;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class Worker extends BatchTaskCreator {
    protected jobGroup: string;

    public constructor(
        @inject(Batch) batch: Batch,
        @inject(PoolLoadGenerator) private readonly poolLoadGenerator: PoolLoadGenerator,
        @inject(BatchPoolLoadSnapshotProvider) private readonly batchPoolLoadSnapshotProvider: BatchPoolLoadSnapshotProvider,
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(BatchConfig) batchConfig: BatchConfig,
        @inject(ServiceConfiguration) serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) logger: GlobalLogger,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        system: typeof System = System,
    ) {
        super(batch, batchConfig, serviceConfig, logger, system);
    }

    public async init(): Promise<void> {
        await super.init();
        this.jobGroup = this.jobManagerConfig.reportGeneratorJobGroup;
    }

    public async getMessagesForTaskCreation(): Promise<ScanMessage[]> {
        const poolMetricsInfo = await this.batch.getPoolMetricsInfo(this.jobGroup);
        const poolLoadSnapshot = await this.poolLoadGenerator.getPoolLoadSnapshot(poolMetricsInfo);
        await this.writePoolLoadSnapshot(poolLoadSnapshot);

        let messages: ScanMessage[] = [];
        if (poolLoadSnapshot.tasksIncrementCountPerInterval > 0) {
            const reportMessages = await this.readReportMessages(poolLoadSnapshot.tasksIncrementCountPerInterval);
            if (reportMessages?.length > 0) {
                messages = this.convertToScanMessages(reportMessages);
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
                const taskArguments = JSON.parse(failedTask.taskArguments) as BatchTaskArguments;
                if (!isEmpty(taskArguments?.scanGroupId)) {
                    let error = `Report generator batch task was terminated unexpectedly. Exit code: ${failedTask.exitCode}`;
                    error =
                        failedTask.failureInfo !== undefined
                            ? // eslint-disable-next-line max-len
                              `${error}, Error category: ${failedTask.failureInfo.category}, Error details: ${failedTask.failureInfo.message}`
                            : error;

                    this.logger.logError(error, { correlatedBatchTaskId: failedTask.id, taskProperties: JSON.stringify(failedTask) });
                } else {
                    this.logger.logError(`Report generator batch task was terminated unexpectedly.`, {
                        correlatedBatchTaskId: failedTask.id,
                        taskProperties: JSON.stringify(failedTask),
                    });
                }
            }),
        );
    }

    private async readReportMessages(requestCount: number): Promise<ScanReportGroup[]> {
        const reportMessages: ScanReportGroup[] = [];
        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<ScanReportGroup[]> = await this.reportGeneratorRequestProvider.readScanGroupIds(
                requestCount,
                continuationToken,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                reportMessages.push(...response.item);
            }
        } while (reportMessages.length < requestCount && continuationToken !== undefined);

        return reportMessages;
    }

    private async writePoolLoadSnapshot(poolLoadSnapshot: PoolLoadSnapshot): Promise<void> {
        await this.batchPoolLoadSnapshotProvider.writeBatchPoolLoadSnapshot({
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            ...({} as StorageDocument),
            batchAccountName: this.batchConfig.accountName,
            ...poolLoadSnapshot,
        });
    }

    private convertToScanMessages(reportRequests: ScanReportGroup[]): ScanMessage[] {
        return reportRequests.map((reportRequest) => {
            const id = this.guidGenerator.createGuid();
            const batchTaskArguments: BatchTaskArguments = {
                id,
                scanGroupId: reportRequest.scanGroupId,
                targetReport: reportRequest.targetReport,
            };
            const batchTaskScanData = {
                messageId: id,
                // batch task parameters passed to container
                messageText: JSON.stringify(batchTaskArguments),
            };

            return {
                scanId: reportRequest.scanGroupId,
                messageId: id,
                message: batchTaskScanData,
            };
        });
    }
}
