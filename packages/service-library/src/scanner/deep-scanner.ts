// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { KnownPage, OnDemandPageScanResult, ScanGroupType, WebsiteScanData } from 'storage-documents';
import { ServiceConfiguration } from 'common';
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
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
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

        const performDeepScan = await this.performDeepScan(pageScanResult, websiteScanData);
        if (performDeepScan === false) {
            this.logger.logInfo(`The website deep scan finished because it reached the maximum number of pages to scan.`, {
                discoveredUrls: `${(websiteScanData.knownPages as KnownPage[]).length}`,
                discoveryLimit: `${websiteScanData.deepScanLimit}`,
            });

            return;
        }

        // Crawling a page if deep scan was enabled
        let discoveredUrls: string[] = [];
        const discoveryPatterns = websiteScanData.discoveryPatterns ?? [this.createDiscoveryPatternFn(websiteScanData.baseUrl)];
        if (websiteScanData.scanGroupType === 'deep-scan') {
            discoveredUrls = await this.crawlRunner.run(pageScanResult.url, discoveryPatterns, page.puppeteerPage);
        }

        const knownUrls = (websiteScanData.knownPages as KnownPage[]).map((p) => p.url);
        const processedUrls = this.discoveredUrlProcessor.process(discoveredUrls, websiteScanData.deepScanLimit, [
            ...knownUrls,
            // Exclude the current page in case a link with hash fragment was discovered (because the hash is removed from a link)
            pageScanResult.url,
        ]);
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

    private async performDeepScan(pageScanResult: OnDemandPageScanResult, websiteScanData: WebsiteScanData): Promise<boolean> {
        // Enable deep scan to handle the provided list of known pages
        if (websiteScanData.scanGroupType === 'group-scan') {
            return websiteScanData.deepScanId === pageScanResult.id;
        }

        // Enable deep scan when the number of URLs is under the discover limit
        const discoveryLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).deepScanDiscoveryLimit;
        if ((websiteScanData.knownPages as KnownPage[]).length < discoveryLimit) {
            return true;
        }

        return false;
    }
}
