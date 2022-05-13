// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DiscoveryPatternFactory, getDiscoveryPatternForUrl } from 'accessibility-insights-crawler';
import { ServiceConfiguration, CrawlConfig } from 'common';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider, RunnerScanMetadata } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
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

    public async runDeepScan(runnerScanMetadata: RunnerScanMetadata, pageScanResult: OnDemandPageScanResult, page: Page): Promise<void> {
        let websiteScanResult = await this.readWebsiteScanResult(pageScanResult, false);
        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
            deepScanId: websiteScanResult.deepScanId,
        });

        const deepScanDiscoveryLimit = await this.getDeepScanLimit(websiteScanResult);
        if (deepScanDiscoveryLimit.canDiscover === false) {
            this.logger.logInfo(`The website deep scan is skipped since there are known pages over discovery limit.`, {
                knownPages: `${websiteScanResult.deepScanLimit}`,
                discoveryLimit: `${(await this.getConfig()).deepScanDiscoveryLimit}`,
            });

            return;
        }

        // read websiteScanResult.knownPages from a storage
        websiteScanResult = await this.readWebsiteScanResult(pageScanResult, true);
        if (websiteScanResult.knownPages !== undefined && websiteScanResult.knownPages.length >= deepScanDiscoveryLimit.limit) {
            this.logger.logInfo(`The website deep scan completed since maximum discovered pages limit was reached.`, {
                discoveredUrls: `${websiteScanResult.knownPages.length}`,
                discoveryLimit: `${deepScanDiscoveryLimit.limit}`,
            });

            return;
        }

        const discoveryPatterns = websiteScanResult.discoveryPatterns ?? [this.discoveryPatternGenerator(websiteScanResult.baseUrl)];
        const discoveredUrls = await this.crawlRunner.run(runnerScanMetadata.url, discoveryPatterns, page.currentPage);
        const processedUrls = this.processUrls(discoveredUrls, deepScanDiscoveryLimit.limit, websiteScanResult.knownPages);
        const websiteScanResultUpdated = await this.updateWebsiteScanResult(
            runnerScanMetadata.id,
            websiteScanResult,
            processedUrls,
            discoveryPatterns,
        );
        await this.scanFeedGenerator.queueDiscoveredPages(websiteScanResultUpdated, pageScanResult);
    }

    private async updateWebsiteScanResult(
        scanId: string,
        websiteScanResult: WebsiteScanResult,
        discoveredUrls: string[],
        discoveryPatterns: string[],
    ): Promise<WebsiteScanResult> {
        const websiteScanResultUpdate: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            knownPages: discoveredUrls,
            discoveryPatterns: discoveryPatterns,
        };

        return this.websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResultUpdate, true);
    }

    private async readWebsiteScanResult(pageScanResult: OnDemandPageScanResult, readCompleteDocument: boolean): Promise<WebsiteScanResult> {
        const scanGroupType = 'deep-scan';
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id, readCompleteDocument);
    }

    private async getDeepScanLimit(websiteScanResult: WebsiteScanResult): Promise<{ limit: number; canDiscover: boolean }> {
        const config = await this.getConfig();
        const limit = websiteScanResult.deepScanLimit ?? config.deepScanDiscoveryLimit;
        // discovery is not possible if deepScanLimit is already higher than deepScanDiscoveryLimit
        const canDiscover = limit <= config.deepScanDiscoveryLimit;

        return {
            limit,
            canDiscover,
        };
    }

    private async getConfig(): Promise<CrawlConfig> {
        return this.serviceConfig.getConfigValue('crawlConfig');
    }
}
