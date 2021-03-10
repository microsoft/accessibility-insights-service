// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { ScanDataProvider, WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult, ScanRunBatchRequest } from 'storage-documents';
import _ from 'lodash';
import { GuidGenerator, RetryHelper, System } from 'common';

@injectable()
export class ScanFeedGenerator {
    private readonly maxRetryCount = 2;

    constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async queueDiscoveredPages(websiteScanResult: WebsiteScanResult, pageScanResult: OnDemandPageScanResult): Promise<void> {
        return this.retryHelper.executeWithRetries(
            () => this.queueDiscoveredPagesImpl(websiteScanResult, pageScanResult),
            async (error: Error) => {
                this.logger.logError(`Failure to queue discovered pages to scan. Retrying on error.`, {
                    error: System.serializeError(error),
                });
            },
            this.maxRetryCount,
            1000,
        );
    }

    private async queueDiscoveredPagesImpl(websiteScanResult: WebsiteScanResult, pageScanResult: OnDemandPageScanResult): Promise<void> {
        const urlsToScan = this.getUrlsToScan(websiteScanResult);
        if (urlsToScan.length > 0) {
            this.logger.logInfo(`Discovered ${urlsToScan.length} new pages to scan.`, {
                discoveredUrls: JSON.stringify(urlsToScan),
            });
        } else {
            this.logger.logInfo(`Discovered no new pages to scan.`);

            return;
        }

        const batchId = this.guidGenerator.createGuid();
        const scanRequests = this.createScanRequests(batchId, urlsToScan, pageScanResult, websiteScanResult);
        const pageScans = scanRequests.map((scanRequest) => {
            return { scanId: scanRequest.scanId, url: scanRequest.url, timestamp: new Date().toJSON() };
        });
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            pageScans,
        };
        await this.websiteScanResultProvider.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResult);
        await this.scanDataProvider.writeScanRunBatchRequest(batchId, scanRequests);
        this.logger.logInfo(`Discovered pages has been queued for scanning.`);
    }

    private createScanRequests(
        batchId: string,
        urls: string[],
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): ScanRunBatchRequest[] {
        return urls.map((url) => {
            // preserve GUID origin for a single batch scope
            const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
            this.logger.logInfo('Generated new scan id for the discovered page.', {
                batchId,
                discoveredScanId: scanId,
                discoveredUrl: url,
            });

            return {
                scanId,
                url,
                priority: _.isNil(pageScanResult.priority) ? 0 : pageScanResult.priority,
                deepScan: true,
                scanNotifyUrl: pageScanResult.notification?.scanNotifyUrl ?? undefined,
                site: {
                    baseUrl: websiteScanResult.baseUrl,
                },
                reportGroups: [
                    {
                        consolidatedId: websiteScanResult.scanGroupId,
                    },
                ],
            };
        });
    }

    private getUrlsToScan(websiteScanResult: WebsiteScanResult): string[] {
        const queuedUrls = websiteScanResult.pageScans.map((pageScan) => pageScan.url);

        return _.pullAll([...websiteScanResult.knownPages], queuedUrls);
    }
}
