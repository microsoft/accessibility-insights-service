// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import {
    PageScanRequestProvider,
    OnDemandPageScanRunResultProvider,
    WebsiteScanResultProvider,
    getOnMergeCallbackToUpdateRunResult,
    ScanNotificationProcessor,
} from 'service-library';
import { OnDemandPageScanRunState, ScanError, OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { isEmpty } from 'lodash';
import { ScanRequestSelector, ScanRequest, DispatchCondition } from './scan-request-selector';

/* eslint-disable max-len */

export type ScheduledScan = 'accessibility' | 'privacy';

@injectable()
export class OnDemandDispatcher {
    private readonly maxRequestsToDelete = 100;

    constructor(
        @inject(Queue) private readonly queue: Queue,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanRequestSelector) private readonly scanRequestSelector: ScanRequestSelector,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
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
            this.maxRequestsToDelete,
        );
        await this.addScanRequests(scanRequests.accessibilityRequestsToQueue, this.storageConfig.scanQueue, 'accessibility');
        await this.addScanRequests(scanRequests.privacyRequestsToQueue, this.storageConfig.privacyScanQueue, 'privacy');
        await this.deleteScanRequests(scanRequests.requestsToDelete);

        this.logger.logInfo(`Adding scan requests to the scan queue completed.`);
    }

    private async addScanRequests(scanRequests: ScanRequest[], scanQueue: string, scheduledScan: ScheduledScan): Promise<void> {
        if (scanRequests.length === 0) {
            this.logger.logInfo(`No pending scan requests available for a ${scanQueue} scan queue.`);

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
                            scheduledScan,
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
                            scheduledScan,
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

        // set scan run state to failed when scan is stale
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
                scanGroupId: pageScanResult.websiteScanRef?.scanGroupId,
                runState: JSON.stringify(pageScanResult.run.state),
            });
        }

        // ensure that website scan result has final state of a page scan to generate up-to-date website scan status result
        let websiteScanResult;
        if (pageScanResult.websiteScanRef !== undefined) {
            websiteScanResult = await this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id, false, pageScanResult.id);
            const pageScan = websiteScanResult.pageScans?.find((s) => s.scanId === pageScanResult.id);
            if (
                !(['completed', 'unscannable', 'failed'] as OnDemandPageScanRunState[]).includes(pageScan?.runState) ||
                runStateUpdated /* update websiteScanResult to trigger scan notification */
            ) {
                runStateUpdated = true;
                const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                    id: pageScanResult.websiteScanRef.id,
                    pageScans: [
                        {
                            scanId: pageScanResult.id,
                            url: pageScanResult.url,
                            scanState: pageScanResult.scanResult?.state,
                            runState: (['completed', 'unscannable'] as OnDemandPageScanRunState[]).includes(pageScanResult.run.state)
                                ? 'completed'
                                : 'failed',
                            timestamp: new Date().toJSON(),
                        },
                    ],
                };

                const onMergeCallbackFn = getOnMergeCallbackToUpdateRunResult(pageScanResult.run.state);
                websiteScanResult = await this.websiteScanResultProvider.mergeOrCreate(
                    pageScanResult.id,
                    updatedWebsiteScanResult,
                    onMergeCallbackFn,
                );

                this.logger.logWarn(`Updated website page scan run state for abandon run.`, {
                    scanId: pageScanResult.id,
                    deepScanId: websiteScanResult.deepScanId,
                    scanGroupId: websiteScanResult.scanGroupId,
                });
            }
        }

        if (runStateUpdated) {
            this.logger.logInfo('Sending scan result notification message.', {
                scanId: scanRequest.request.id,
                deepScanId: websiteScanResult?.deepScanId,
            });

            await this.scanNotificationProcessor.sendScanCompletionNotification(pageScanResult, websiteScanResult);
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
            // reset error document property if no error
            error: error ?? null,
            // undefined value indicates first scan request processing (not a retry attempt)
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
