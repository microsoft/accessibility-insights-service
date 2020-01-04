// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Batch, SystemConfig } from 'azure-services';
import { QueueRuntimeConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as moment from 'moment';
import { BatchPoolAlias, ScanProcessingStateProvider } from 'service-library';
import { BatchPoolLoadSnapshot, StorageDocument } from 'storage-documents';

@injectable()
export class QueueSizeGenerator {
    constructor(
        @inject(Batch) private readonly batch: Batch,
        @inject(ScanProcessingStateProvider) private readonly scanProcessingStateProvider: ScanProcessingStateProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(SystemConfig) private readonly systemConfig: SystemConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async getTargetQueueSize(currentQueueSize: number): Promise<number> {
        const senderRunIntervalInSeconds = (await this.batch.getJobScheduleRunIntervalInMinutes()) * 60;
        const poolLoadSnapshot = await this.scanProcessingStateProvider.readBatchPoolLoadSnapshot(
            this.systemConfig.batchAccountName,
            'urlScanPool',
        );
        if (poolLoadSnapshot === undefined) {
            const defaultQueueSize = (await this.getQueueRuntimeConfig()).maxQueueSize;
            await this.writeScanQueueLoadSnapshot(defaultQueueSize, 1, senderRunIntervalInSeconds);
            this.logger.logInfo(
                // tslint:disable-next-line: max-line-length
                `[Sender] The load snapshot for ${'urlScanPool' as BatchPoolAlias} Batch pool is not available. Fallback to the configured default queue size: ${defaultQueueSize}`,
            );

            return defaultQueueSize;
        }

        const queueDrainSpeed = this.getQueueDrainSpeed(poolLoadSnapshot, senderRunIntervalInSeconds);
        const queueBufferingIndex = await this.getQueueBufferingIndex(poolLoadSnapshot, currentQueueSize);
        const targetQueueSize = Math.ceil(
            poolLoadSnapshot.targetMaxTasksPerPool /* startup queue consumer buffer */ + queueDrainSpeed * queueBufferingIndex,
        );

        await this.writeScanQueueLoadSnapshot(targetQueueSize, queueBufferingIndex, senderRunIntervalInSeconds);
        this.logger.logInfo(`[Sender] The calculated dynamic queue size is ${targetQueueSize}`);

        return targetQueueSize;
    }

    private getQueueDrainSpeed(poolLoadSnapshot: BatchPoolLoadSnapshot, senderRunIntervalInSeconds: number): number {
        if (poolLoadSnapshot.isIdle) {
            // If the queue consumer is idle calculate approximate drain speed
            return Math.ceil(
                poolLoadSnapshot.targetMaxTasksPerPool * (senderRunIntervalInSeconds / poolLoadSnapshot.poolFillIntervalInSeconds + 1),
            );
        } else {
            return Math.ceil(
                poolLoadSnapshot.tasksIncrementCountPerInterval *
                    (senderRunIntervalInSeconds / poolLoadSnapshot.samplingIntervalInSeconds + 1),
            );
        }
    }

    private async getQueueBufferingIndex(poolLoadSnapshot: BatchPoolLoadSnapshot, currentQueueSize: number): Promise<number> {
        // reset queue buffering index to slow start when pool continuously idle
        if (currentQueueSize > 0 && poolLoadSnapshot.activityStateFlags === 0) {
            return 1;
        }

        const scanQueueLoadSnapshot = await this.scanProcessingStateProvider.readScanQueueLoadSnapshot(
            this.systemConfig.storageName,
            'onDemandScanRequest',
        );
        const lastQueueBufferingIndex = scanQueueLoadSnapshot !== undefined ? scanQueueLoadSnapshot.queueBufferingIndex : 1;

        // If the queue drained since the last run, then increase the queue buffering index
        return currentQueueSize > 0 ? lastQueueBufferingIndex : lastQueueBufferingIndex + 1;
    }

    private async writeScanQueueLoadSnapshot(
        targetQueueSize: number,
        queueBufferingIndex: number,
        senderRunIntervalInSeconds: number,
    ): Promise<void> {
        await this.scanProcessingStateProvider.writeScanQueueLoadSnapshot(
            {
                // tslint:disable-next-line: no-object-literal-type-assertion
                ...({} as StorageDocument),
                storageAccountName: this.systemConfig.storageName,
                queueName: this.systemConfig.scanQueue,
                queueSizePerInterval: targetQueueSize,
                queueBufferingIndex: queueBufferingIndex,
                samplingIntervalInSeconds: senderRunIntervalInSeconds,
                timestamp: moment().toDate(),
            },
            'onDemandScanRequest',
        );
    }

    private async getQueueRuntimeConfig(): Promise<QueueRuntimeConfig> {
        return this.serviceConfig.getConfigValue('queueConfig');
    }
}
