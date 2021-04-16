// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { ScanDataProvider, WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult, ScanRunBatchRequest } from 'storage-documents';
import _ from 'lodash';
import { GuidGenerator, RetryHelper, System } from 'common';
import pLimit from 'p-limit';

@injectable()
export class ScanFeedGenerator {
    public maxBatchSize = 20;
    private readonly maxRetryCount = 5;
    private readonly maxConcurrencyLimit = 5;

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

        const scanRequests = await this.createBatchRequests(urlsToScan, websiteScanResult, pageScanResult);
        await this.updateWebsiteScanResult(scanRequests, websiteScanResult, pageScanResult);
        this.logger.logInfo(`Discovered pages has been queued for scanning.`);
    }

    private async createBatchRequests(
        urlsToScan: string[],
        websiteScanResult: WebsiteScanResult,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<ScanRunBatchRequest[]> {
        const scanRequests: ScanRunBatchRequest[] = [];
        const chunks = System.chunkArray(urlsToScan, this.maxBatchSize);
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            chunks.map(async (urls) => {
                return limit(async () => {
                    const requests = await this.createBatchRequest(urls, websiteScanResult, pageScanResult);
                    scanRequests.push(...requests);
                });
            }),
        );

        return scanRequests;
    }

    private async createBatchRequest(
        urls: string[],
        websiteScanResult: WebsiteScanResult,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<ScanRunBatchRequest[]> {
        const batchId = this.guidGenerator.createGuid();
        const scanRequests = this.createScanRequests(batchId, urls, pageScanResult, websiteScanResult);
        await this.scanDataProvider.writeScanRunBatchRequest(batchId, scanRequests);

        return scanRequests;
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

    private async updateWebsiteScanResult(
        scanRequests: ScanRunBatchRequest[],
        websiteScanResult: WebsiteScanResult,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<void> {
        const pageScans = scanRequests.map((scanRequest) => {
            return { scanId: scanRequest.scanId, url: scanRequest.url, timestamp: new Date().toJSON() };
        });
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            pageScans,
        };
        await this.websiteScanResultProvider.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResult);
    }

    private getUrlsToScan(websiteScanResult: WebsiteScanResult): string[] {
        const queuedUrls = websiteScanResult.pageScans.map((pageScan) => pageScan.url);

        return _.pullAll([...websiteScanResult.knownPages], queuedUrls);
    }
}
