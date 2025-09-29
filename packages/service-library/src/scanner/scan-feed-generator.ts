// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, WebsiteScanData, ScanRunBatchRequest, KnownPage } from 'storage-documents';
import { isElement, isEmpty } from 'lodash';
import { GuidGenerator, System } from 'common';
import { ScanDataProvider } from '../data-providers/scan-data-provider';
import { WebsiteScanDataProvider } from '../data-providers/website-scan-data-provider';

@injectable()
export class ScanFeedGenerator {
    public maxBatchSize = 10;

    constructor(
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanDataProvider) protected readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async queueDiscoveredPages(websiteScanData: WebsiteScanData, pageScanResult: OnDemandPageScanResult): Promise<void> {
        const urlsToScan = this.getPagesToQueue(websiteScanData);
        if (urlsToScan.length > 0) {
            this.logger.logInfo(`Found ${urlsToScan.length} discovered pages that need to be scanned.`, {
                discoveredUrls: JSON.stringify(urlsToScan),
            });
        } else {
            this.logger.logInfo(`Did not find any discovered pages that require scanning.`);

            return;
        }

        const scanRequests = await this.createBatchRequests(urlsToScan, websiteScanData, pageScanResult);
        await this.updateWebsiteScanData(scanRequests, websiteScanData);
        this.logger.logInfo(`Discovered pages has been queued for scanning.`);
    }

    private async createBatchRequests(
        urlsToScan: string[],
        websiteScanData: WebsiteScanData,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<ScanRunBatchRequest[]> {
        const scanRequests: ScanRunBatchRequest[] = [];
        const chunks = System.chunkArray(urlsToScan, this.maxBatchSize);
        await Promise.all(
            chunks.map(async (urls) => {
                const requests = await this.createBatchRequest(urls, websiteScanData, pageScanResult);
                scanRequests.push(...requests);
            }),
        );

        return scanRequests;
    }

    private async createBatchRequest(
        urls: string[],
        websiteScanData: WebsiteScanData,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<ScanRunBatchRequest[]> {
        const batchId = this.guidGenerator.createGuid();
        const scanRequests = this.createScanRequests(batchId, urls, websiteScanData, pageScanResult);
        await this.scanDataProvider.writeScanRunBatchRequest(batchId, scanRequests);

        return scanRequests;
    }

    private createScanRequests(
        batchId: string,
        urls: string[],
        websiteScanData: WebsiteScanData,
        pageScanResult: OnDemandPageScanResult,
    ): ScanRunBatchRequest[] {
        return urls.map((url) => {
            // Preserve GUID origin for a single batch scope
            const scanId = this.guidGenerator.createGuidFromBaseGuid(batchId);
            this.logger.logInfo('Generated scan id for the discovered page.', {
                batchId,
                discoveredScanId: scanId,
                discoveredUrl: url,
            });

            // Allow extended scanning of original request pages only.
            const isRequestKnownPage = (websiteScanData.knownPages as KnownPage[])?.some((p) => p.url === url && p.source === 'request');
            const scanDefinitions =
                pageScanResult.scanDefinitions === undefined || isRequestKnownPage === false
                    ? {}
                    : { scanDefinitions: pageScanResult.scanDefinitions };

            return {
                scanId,
                url,
                priority: isElement(pageScanResult.priority) ? 0 : pageScanResult.priority,
                // Allow later deep scan for specific deep scan type request
                deepScan: pageScanResult.websiteScanRef.scanGroupType === 'deep-scan',
                // Propagate the deep scan id to subsequent requests
                deepScanId: websiteScanData.deepScanId,
                authenticationType: pageScanResult.authentication?.hint ?? undefined,
                ...scanDefinitions,
                ...(pageScanResult.privacyScan === undefined ? {} : { privacyScan: pageScanResult.privacyScan }),
                site: {
                    baseUrl: websiteScanData.baseUrl,
                },
                reportGroups: [
                    {
                        consolidatedId: websiteScanData.scanGroupId,
                    },
                ],
            };
        });
    }

    private async updateWebsiteScanData(scanRequests: ScanRunBatchRequest[], websiteScanData: WebsiteScanData): Promise<void> {
        const knownPages = scanRequests.map((scanRequest) => {
            return { url: scanRequest.url, scanId: scanRequest.scanId, runState: 'accepted' };
        }) as KnownPage[];

        await this.websiteScanDataProvider.updateKnownPages(websiteScanData, knownPages);
    }

    private getPagesToQueue(websiteScanData: WebsiteScanData): string[] {
        return (websiteScanData.knownPages as KnownPage[]).filter((page) => isEmpty(page.scanId)).map((page) => page.url);
    }
}
