// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { OnDemandPageScanRunState, ScanError, OnDemandPageScanResult } from 'storage-documents';
import { ScanRequestSelector, ScanRequest } from './scan-request-selector';

/* eslint-disable max-len */
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
        this.logger.logInfo(`Maximum target scan queue size: ${configQueueSize}.`);

        const accessibilityCurrentQueueSize = await this.queue.getMessageCount(this.storageConfig.scanQueue);
        const privacyCurrentQueueSize = await this.queue.getMessageCount(this.storageConfig.privacyScanQueue);
        this.logger.logInfo(
            `Current accessibility scan queue size: ${accessibilityCurrentQueueSize}. Current privacy scan queue size: ${privacyCurrentQueueSize}.`,
        );

        if (accessibilityCurrentQueueSize >= configQueueSize && privacyCurrentQueueSize >= configQueueSize) {
            this.logger.logInfo('Skip adding new scan requests as all scan queues already reached maximum capacity.');

            return;
        }

        const scanRequests = await this.scanRequestSelector.getRequests(
            configQueueSize - accessibilityCurrentQueueSize,
            configQueueSize - privacyCurrentQueueSize,
        );
        await this.addScanRequests(scanRequests.accessibilityRequestsToQueue, this.storageConfig.scanQueue);
        await this.addScanRequests(scanRequests.privacyRequestsToQueue, this.storageConfig.privacyScanQueue);
        await this.deleteScanRequests(scanRequests.requestsToDelete);

        this.logger.logInfo(`Adding scan requests to the scan queue completed.`);
    }

    private async addScanRequests(scanRequests: ScanRequest[], scanQueue: string): Promise<void> {
        if (scanRequests.length === 0) {
            this.logger.logInfo(`No pending scan requests available for a ${scanQueue} scan queue.`);

            return;
        }

        let count = 0;
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                // the message to be read by job manager and pass to task runner
                const message = {
                    id: scanRequest.request.id,
                    url: scanRequest.request.url,
                    deepScan: scanRequest.request.deepScan,
                };

                let success = false;
                success = await this.queue.createMessage(scanQueue, message);

                if (success === true) {
                    count++;
                    await this.updateScanResultState(scanRequest.result, 'queued');
                    await this.trace(scanRequest);
                } else {
                    const error: ScanError = {
                        errorType: 'InternalError',
                        message: `Failed to add a scan request message to the ${scanQueue} scan queue.`,
                    };
                    await this.updateScanResultState(scanRequest.result, 'failed', error);
                    this.logger.logError(`Failed to add a scan request message to the ${scanQueue} scan queue.`, {
                        scanId: scanRequest.request.id,
                    });
                }
            }),
        );

        this.logger.trackEvent('ScanRequestQueued', null, { queuedScanRequests: count });
    }

    private async deleteScanRequests(scanRequests: ScanRequest[]): Promise<void> {
        if (scanRequests.length === 0) {
            return;
        }

        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                await this.pageScanRequestProvider.deleteRequests([scanRequest.request.id]);
                await this.trace(scanRequest);
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
            retryCount: scanResult.run?.retryCount !== undefined ? scanResult.run.retryCount + 1 : 0, // undefined value indicates first scan request processing (not retry attempt)
        };

        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(scanResult);
        if (response.succeeded === false) {
            this.logger.logError('Failed to update scan result state as it was modified by external process.', {
                scanId: scanResult.id,
            });
        }
    }

    private async trace(scanRequest: ScanRequest): Promise<void> {
        switch (scanRequest.condition) {
            case 'notFound': {
                this.logger.logError('The scan result document not found in a storage. Removing scan request from a request queue.', {
                    scanId: scanRequest.request.id,
                });
                break;
            }
            case 'completed': {
                this.logger.logInfo('The scan request has been completed. Removing scan request from a request queue.', {
                    scanId: scanRequest.request.id,
                });
                break;
            }
            case 'noRetry': {
                this.logger.logError('The scan request has reached maximum retry count. Removing scan request from a request queue.', {
                    scanId: scanRequest.request.id,
                });
                break;
            }
            case 'accepted': {
                this.logger.logInfo('Sending scan request to a request queue.', {
                    scanId: scanRequest.request.id,
                });
                break;
            }
            case 'retry': {
                this.logger.logInfo('Sending scan request to a request queue with new retry attempt.', {
                    scanId: scanRequest.request.id,
                    runState: scanRequest.result.run.state,
                    runTimestamp: scanRequest.result.run.timestamp,
                    runRetryCount: scanRequest.result.run.retryCount ? scanRequest.result.run.retryCount.toString() : '0',
                });
                break;
            }
            default: {
                throw new Error(`The '${scanRequest.condition}' operation condition not supported.`);
            }
        }
    }
}
