// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import {
    PageScanRequestProvider,
    OnDemandPageScanRunResultProvider,
    ScanNotificationProcessor,
    WebsiteScanDataProvider,
} from 'service-library';
import { OnDemandPageScanRunState, ScanError, OnDemandPageScanResult, ScanType, KnownPage } from 'storage-documents';
import { isEmpty } from 'lodash';
import { ScanRequestSelector, ScanRequest, DispatchCondition } from './scan-request-selector';

@injectable()
export class OnDemandDispatcher {
    private readonly targetDeleteRequests = 100;

    private targetQueueSize: number;

    constructor(
        @inject(Queue) private readonly queue: Queue,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanRequestSelector) private readonly scanRequestSelector: ScanRequestSelector,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanDataProvider) private readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async dispatchScanRequests(): Promise<void> {
        this.targetQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`Target scan queue size ${this.targetQueueSize}.`);

        await this.dispatchRequests('accessibility', this.storageConfig.scanQueue);
        await this.dispatchRequests('privacy', this.storageConfig.privacyScanQueue);
    }

    private async dispatchRequests(scanType: ScanType, queueName: string): Promise<void> {
        const currentQueueSize = await this.queue.getMessageCount(queueName);
        this.logger.logInfo(`Current ${scanType} queue size ${currentQueueSize}.`);

        if (currentQueueSize >= this.targetQueueSize) {
            this.logger.logInfo(`The ${scanType} scan queue has reached the target capacity.`);
        }

        const queueCapacity = this.targetQueueSize - currentQueueSize >= 0 ? this.targetQueueSize - currentQueueSize : 0;
        const scanRequests = await this.scanRequestSelector.getRequests(scanType, queueCapacity, this.targetDeleteRequests);
        await this.addScanRequests(scanType, queueName, scanRequests.queueRequests);
        await this.deleteScanRequests(scanRequests.deleteRequests);

        this.logger.logInfo(`Queued ${scanRequests.queueRequests.length} new ${scanType} scan requests.`);
    }

    private async addScanRequests(scanType: ScanType, scanQueue: string, scanRequests: ScanRequest[]): Promise<void> {
        if (scanRequests.length === 0) {
            return;
        }

        let count = 0;
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                // the message to be read by job manager and pass through to task runner
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
                    this.logger.logInfo(`Added a scan request message to the ${scanQueue} scan queue.`, {
                        scanId: scanRequest.request.id,
                    });
                    this.logger.trackEvent(
                        'ScanRequestScheduled',
                        {
                            scanId: scanRequest.request.id,
                            url: scanRequest.request.url,
                            scanType,
                        },
                        {
                            scheduledScanRequests: 1,
                        },
                    );
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
                    this.logger.trackEvent(
                        'ScanRequestSchedulingFailed',
                        {
                            scanId: scanRequest.request.id,
                            url: scanRequest.request.url,
                            scanType,
                        },
                        {
                            failedScheduleScanRequests: 1,
                        },
                    );
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
                await this.updateScanResultStateOnDelete(scanRequest);
                await this.pageScanRequestProvider.deleteRequests([scanRequest.request.id]);
                await this.trace(scanRequest);
            }),
        );
    }

    private async updateScanResultStateOnDelete(scanRequest: ScanRequest): Promise<void> {
        const pageScanResult = scanRequest.result;
        if (isEmpty(pageScanResult)) {
            return;
        }

        // Force scan run state to `failed` when scan is stale to trigger scan notification
        let runStateUpdated = false;
        if ((['stale', 'abandoned'] as DispatchCondition[]).includes(scanRequest.condition)) {
            runStateUpdated = true;
            pageScanResult.run = {
                ...pageScanResult.run,
                state: 'failed',
                error: `The scan request was abandon in a service pipeline. State: ${JSON.stringify(pageScanResult.run)}`,
                timestamp: new Date().toJSON(),
            };

            await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

            this.logger.logWarn('Updated page scan run state for abandon run.', {
                scanId: pageScanResult.id,
                runState: JSON.stringify(pageScanResult.run.state),
            });
        }

        // Ensure that website scan reflects the last state of scanned page
        let websiteScanData = await this.websiteScanDataProvider.read(pageScanResult.websiteScanRef.id);
        const pageState = (websiteScanData?.knownPages as KnownPage[])?.find((p) => p.scanId === pageScanResult.id);
        if (!(['completed', 'unscannable', 'failed'] as OnDemandPageScanRunState[]).includes(pageState?.runState) || runStateUpdated) {
            runStateUpdated = true;

            const knownPage: KnownPage = {
                url: pageScanResult.url,
                scanId: pageScanResult.id,
                scanState: pageScanResult.scanResult?.state,
                runState: (['completed', 'unscannable'] as OnDemandPageScanRunState[]).includes(pageScanResult.run.state)
                    ? 'completed'
                    : 'failed',
            };

            websiteScanData = await this.websiteScanDataProvider.updateKnownPages(websiteScanData, [knownPage]);

            this.logger.logWarn(`Updated website page scan state for abandon run.`, {
                scanId: pageScanResult.id,
                deepScanId: websiteScanData?.deepScanId,
            });
        }

        if (runStateUpdated) {
            this.logger.logInfo('Triggering scan result notification.', {
                scanId: scanRequest.request.id,
                deepScanId: websiteScanData?.deepScanId,
            });

            await this.scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanData);
        }
    }

    private async updateScanResultState(
        scanResult: OnDemandPageScanResult,
        state: OnDemandPageScanRunState,
        error?: ScanError,
    ): Promise<void> {
        scanResult.run = {
            state,
            timestamp: new Date().toJSON(),
            // Reset error document property if no error
            error: error ?? null,
            // Undefined value indicates first scan request processing (not a retry attempt)
            retryCount: scanResult.run?.retryCount !== undefined ? scanResult.run.retryCount + 1 : 0,
        };

        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(scanResult);
        if (response.succeeded === false) {
            this.logger.logError('Failed to update scan result state as it was modified by other process.', {
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
            case 'noRetry':
            case 'stale': {
                this.logger.logWarn('The scan request has reached maximum retry count. Removing scan request from a request queue.', {
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
                this.logger.logWarn('Sending scan request to a request queue with new retry attempt.', {
                    scanId: scanRequest.request.id,
                    runState: scanRequest.result.run.state,
                    runTimestamp: scanRequest.result.run.timestamp,
                    runRetryCount: scanRequest.result.run.retryCount ? scanRequest.result.run.retryCount.toString() : '0',
                });
                break;
            }
            case 'abandoned': {
                this.logger.logError('The scan request was abandoned. Removing scan request from a request queue.', {
                    scanId: scanRequest.request.id,
                });
                break;
            }
            default: {
                this.logger.logInfo(`The scan request with dispatch condition ${scanRequest.condition} has been processed.`, {
                    scanId: scanRequest.request.id,
                });
            }
        }
    }
}
