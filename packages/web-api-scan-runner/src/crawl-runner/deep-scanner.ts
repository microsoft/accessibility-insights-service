// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DiscoveryPatternFactory, getDiscoveryPatternForUrl } from 'accessibility-insights-crawler';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, ScanGroupType, WebsiteScanResult } from 'storage-documents';
import { WebsiteScanResultWriter } from '../runner/website-scan-result-writer';
import { ScanMetadata } from '../types/scan-metadata';
import { DiscoveredUrlProcessor, discoveredUrlProcessor } from './discovered-url-processor';
import { CrawlRunner } from './crawl-runner';
import { ScanFeedGenerator } from './scan-feed-generator';

@injectable()
export class DeepScanner {
    constructor(
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(WebsiteScanResultWriter) private readonly websiteScanResultWriter: WebsiteScanResultWriter,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly processUrls: DiscoveredUrlProcessor = discoveredUrlProcessor,
        private readonly discoveryPatternGenerator: DiscoveryPatternFactory = getDiscoveryPatternForUrl,
    ) {}

    public async runDeepScan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult, page: Page): Promise<void> {
        const websiteScanResult = await this.readWebsiteScanResult(pageScanResult, 'deep-scan');
        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
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
        const discoveredUrls = await this.crawlRunner.run(scanMetadata.url, discoveryPatterns, page.getUnderlyingPage());
        const processedUrls = this.processUrls(discoveredUrls, urlCrawlLimit, websiteScanResult.knownPages);
        const websiteScanResultUpdated = await this.websiteScanResultWriter.updateWebsiteScanResultWithDiscoveredUrls(
            pageScanResult,
            processedUrls,
            discoveryPatterns,
        );
        await this.scanFeedGenerator.queueDiscoveredPages(websiteScanResultUpdated, pageScanResult);
    }

    private async readWebsiteScanResult(pageScanResult: OnDemandPageScanResult, scanGroupType: ScanGroupType): Promise<WebsiteScanResult> {
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id);
    }
}
