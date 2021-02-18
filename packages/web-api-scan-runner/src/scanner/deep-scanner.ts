// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DiscoveryPatternFactory, getDiscoveryPatternForUrl } from 'accessibility-insights-crawler';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { ScanMetadata } from '../types/scan-metadata';
import { DiscoveredUrlProcessor, discoveredUrlProcessor } from '../crawl-runner/discovered-url-processor';
import { CrawlRunner } from '../crawl-runner/crawl-runner';
import { ScanFeedGenerator } from '../crawl-runner/scan-feed-generator';

@injectable()
export class DeepScanner {
    constructor(
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly processUrls: DiscoveredUrlProcessor = discoveredUrlProcessor,
        private readonly discoveryPatternGenerator: DiscoveryPatternFactory = getDiscoveryPatternForUrl,
    ) {}

    public async runDeepScan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult, page: Page): Promise<void> {
        const websiteScanResult = await this.readWebsiteScanResult(pageScanResult);
        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
            deepScanId: websiteScanResult.deepScanId,
        });

        const urlCrawlLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit;
        if (websiteScanResult.knownPages !== undefined && websiteScanResult.knownPages.length >= urlCrawlLimit) {
            this.logger.logInfo(`The website deep scan completed since maximum discovered pages limit was reached.`, {
                discoveredUrlsTotal: websiteScanResult.knownPages.length.toString(),
                discoveredUrlsLimit: urlCrawlLimit.toString(),
            });

            return;
        }

        const discoveryPatterns = websiteScanResult.discoveryPatterns ?? [this.discoveryPatternGenerator(websiteScanResult.baseUrl)];
        const discoveredUrls = await this.crawlRunner.run(scanMetadata.url, discoveryPatterns, page.currentPage);
        const processedUrls = this.processUrls(discoveredUrls, urlCrawlLimit, websiteScanResult.knownPages);
        const websiteScanResultUpdated = await this.updateWebsiteScanResult(websiteScanResult, processedUrls, discoveryPatterns);
        await this.scanFeedGenerator.queueDiscoveredPages(websiteScanResultUpdated, pageScanResult);
    }

    private async updateWebsiteScanResult(
        websiteScanResult: WebsiteScanResult,
        discoveredUrls: string[],
        discoveryPatterns: string[],
    ): Promise<WebsiteScanResult> {
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            knownPages: discoveredUrls,
            discoveryPatterns: discoveryPatterns,
        };

        return this.websiteScanResultProvider.mergeOrCreate(updatedWebsiteScanResult);
    }

    private async readWebsiteScanResult(pageScanResult: OnDemandPageScanResult): Promise<WebsiteScanResult> {
        const scanGroupType = 'deep-scan';
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id);
    }
}
