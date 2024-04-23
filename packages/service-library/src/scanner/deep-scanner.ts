// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { KnownPage, OnDemandPageScanResult, ScanGroupType, WebsiteScanData } from 'storage-documents';
import { CrawlRunner } from '../crawler/crawl-runner';
import { DiscoveredUrlProcessor } from '../crawler/discovered-url-processor';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { WebsiteScanDataProvider } from '../data-providers/website-scan-data-provider';
import { ScanFeedGenerator } from './scan-feed-generator';

@injectable()
export class DeepScanner {
    constructor(
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanDataProvider) protected readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(DiscoveredUrlProcessor) private readonly discoveredUrlProcessor: DiscoveredUrlProcessor,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async runDeepScan(pageScanResult: OnDemandPageScanResult, websiteScanData: WebsiteScanData, page: Page): Promise<void> {
        if (!(['deep-scan', 'group-scan'] as ScanGroupType[]).includes(websiteScanData.scanGroupType)) {
            return;
        }

        this.logger.setCommonProperties({
            websiteScanId: websiteScanData.id,
            deepScanId: websiteScanData.deepScanId,
        });

        let discoveryPatterns;
        let discoveredUrls: string[] = [];

        const performDeepScan = await this.performDeepScan(websiteScanData);
        if (performDeepScan === true) {
            discoveryPatterns = websiteScanData.discoveryPatterns ?? [this.createDiscoveryPatternFn(websiteScanData.baseUrl)];
            this.logger.logInfo(`Running web crawler on a page for the deep scan request.`, {
                discoveryPatterns: JSON.stringify(discoveryPatterns),
            });

            discoveredUrls = await this.crawlRunner.run(pageScanResult.url, discoveryPatterns, page.puppeteerPage);
        }

        // Filter out links that are not supported from the crawled and known pages
        const knownUrls = (websiteScanData.knownPages as KnownPage[]).map((p) => p.url);
        const processedUrls = this.discoveredUrlProcessor.process(discoveredUrls, websiteScanData.deepScanLimit, [
            ...knownUrls,
            // Exclude the current page in case a link with hash fragment was discovered (because the hash is removed from a link)
            pageScanResult.url,
        ]);

        // Update known pages list and run state
        const websiteScanDataUpdated = await this.updateWebsiteScanData(websiteScanData, discoveryPatterns, processedUrls);
        await this.scanFeedGenerator.queueDiscoveredPages(websiteScanDataUpdated, pageScanResult);
    }

    private async updateWebsiteScanData(
        websiteScanData: WebsiteScanData,
        discoveryPatterns: string[],
        discoveredUrls: string[],
    ): Promise<WebsiteScanData> {
        // Update known pages
        const knownPages: KnownPage[] = discoveredUrls.map((url) => {
            return { url, runState: 'pending' };
        });
        await this.websiteScanDataProvider.updateKnownPages(websiteScanData, knownPages);

        // Update discovery patterns
        const websiteScanDataUpdate: Partial<WebsiteScanData> = {
            id: websiteScanData.id,
            discoveryPatterns: discoveryPatterns,
        };

        return this.websiteScanDataProvider.merge(websiteScanDataUpdate);
    }

    private async performDeepScan(websiteScanData: WebsiteScanData): Promise<boolean> {
        // Enable deep scan when the number of URLs is under the discover limit
        return (
            websiteScanData.scanGroupType === 'deep-scan' &&
            (websiteScanData.knownPages as KnownPage[]).length < websiteScanData.deepScanLimit
        );
    }
}
