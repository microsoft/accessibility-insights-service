// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { OnDemandPageScanRunState, ScanError, OnDemandPageScanResult } from 'storage-documents';
import { ScanRequestSelector, ScanRequest } from './scan-request-selector';

@injectable()
export class OnDemandDispatcher {
    constructor(
        @inject(Queue) private readonly queue: Queue,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanRequestSelector) private readonly scanRequestSelector: ScanRequestSelector,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
    ) {}

    public async dispatchScanRequests(): Promise<void> {
        const configQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`Maximum scan task queue size configuration set to ${configQueueSize}.`);

        const currentQueueSize = await this.getCurrentQueueSize();
        this.logger.logInfo(`Current scan task queue size is ${currentQueueSize}.`);
        if (currentQueueSize >= configQueueSize) {
            this.logger.logInfo('Skip adding new scan requests as scan task queue already reached to its maximum capacity.');

            return;
        }

        const scanRequests = await this.scanRequestSelector.getRequests(configQueueSize - currentQueueSize);
        await this.addScanRequests(scanRequests.toQueue);
        await this.deleteScanRequests(scanRequests.toDelete);

        this.logger.logInfo(`Adding scan requests to the task scan queue completed. Current queue size ${currentQueueSize}.`);
    }

    private async addScanRequests(scanRequests: ScanRequest[]): Promise<void> {
        if (scanRequests.length === 0) {
            this.logger.logInfo(`No new scan requests available in a request queue.`);

            return;
        }

        this.logger.logInfo(`Adding ${scanRequests.length} scan requests to the task scan queue.`);
        this.logger.trackEvent('ScanRequestQueued', null, { queuedScanRequests: scanRequests.length });

        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                const message = {
                    id: scanRequest.request.id,
                    url: scanRequest.request.url,
                    deepScan: scanRequest.request.deepScan,
                };
                const response = await this.queue.createMessage(this.storageConfig.scanQueue, message);

                if (response === true) {
                    await this.updateScanResultState(scanRequest.result, 'queued');
                    this.logger.logInfo('Successfully added scan request to the scan task queue.', {
                        scanId: scanRequest.request.id,
                    });
                } else {
                    const error: ScanError = {
                        errorType: 'InternalError',
                        message: 'Failed to create a scan request queue message.',
                    };
                    await this.updateScanResultState(scanRequest.result, 'failed', error);
                    this.logger.logError('Failed to add scan request to the scan task queue.', {
                        scanId: scanRequest.request.id,
                    });
                }
            }),
        );
    }

    private async deleteScanRequests(scanRequests: ScanRequest[]): Promise<void> {
        if (scanRequests.length === 0) {
            return;
        }

        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                await this.pageScanRequestProvider.deleteRequests([scanRequest.request.id]);
                this.logger.logInfo('Successfully deleted scan request from a request queue.', {
                    scanId: scanRequest.request.id,
                });
            }),
        );
    }

    private async updateScanResultState(
        scanResult: OnDemandPageScanResult,
        state: OnDemandPageScanRunState,
        error?: ScanError,
    ): Promise<void> {
        scanResult.run = {
            state,
            timestamp: new Date().toJSON(),
            error: error ?? null, // reset error document property if no any error
            retryCount: scanResult.run.retryCount ? scanResult.run.retryCount + 1 : 0,
        };

        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(scanResult);
        if (response.succeeded === false) {
            this.logger.logError('Failed to update scan result state as it was modified by external process.', {
                scanId: scanResult.id,
            });
        }
    }

    private async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount(this.storageConfig.scanQueue);
    }
}
