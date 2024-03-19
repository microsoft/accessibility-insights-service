// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanDataProvider, RunnerScanMetadata, CrawlRunner, DiscoveredUrlProcessor, createDiscoveryPattern } from 'service-library';
import { KnownPage, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { ServiceConfiguration } from 'common';
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

    public async runDeepScan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanData,
        page: Page,
    ): Promise<void> {
        if (websiteScanData === undefined || pageScanResult.websiteScanRef?.scanGroupType === 'single-scan') {
            return;
        }

        this.logger.setCommonProperties({
            websiteScanId: websiteScanData.id,
            deepScanId: websiteScanData.deepScanId,
        });

        const deepScanDiscoveryLimit = websiteScanData.deepScanLimit;
        const canDeepScan = await this.canDeepScan(websiteScanData);
        if (canDeepScan === false) {
            this.logger.logInfo(`The website deep scan finished because it reached the maximum number of pages.`, {
                discoveredUrls: `${(websiteScanData.knownPages as KnownPage[]).length}`,
                discoveryLimit: `${deepScanDiscoveryLimit}`,
            });

            return;
        }

        // Crawling a page if deep scan was enabled
        let discoveredUrls: string[] = [];
        const discoveryPatterns = websiteScanData.discoveryPatterns ?? [this.createDiscoveryPatternFn(websiteScanData.baseUrl)];
        if (runnerScanMetadata.deepScan === true) {
            discoveredUrls = await this.crawlRunner.run(runnerScanMetadata.url, discoveryPatterns, page.puppeteerPage);
        }

        const knownUrls = (websiteScanData.knownPages as KnownPage[]).map((p) => p.url);
        const processedUrls = this.discoveredUrlProcessor.process(discoveredUrls, deepScanDiscoveryLimit, [
            ...knownUrls,
            // Exclude the current page in case a link with hash fragment was discovered (because the hash is removed from a link)
            runnerScanMetadata.url,
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
            state: 'running',
        };

        return this.websiteScanDataProvider.mergeOrCreate(websiteScanDataUpdate);
    }

    private async canDeepScan(websiteScanData: WebsiteScanData): Promise<boolean> {
        const discoveryLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).deepScanDiscoveryLimit;

        // Enable deep scan if the number of URLs exceeds the discovery limit to handle the provided list of known pages
        if (websiteScanData.deepScanLimit > discoveryLimit && websiteScanData.state !== 'running') {
            return true;
        }

        // Enable deep scan when the number of URLs found is under the discover limit
        if ((websiteScanData.knownPages as KnownPage[]).length < discoveryLimit) {
            return true;
        }

        return false;
    }
}
