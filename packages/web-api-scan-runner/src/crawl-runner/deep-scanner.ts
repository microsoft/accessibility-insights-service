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
import { DiscoveredUrlProcessor, processDiscoveredUrls } from '../crawler/process-discovered-urls';
import { WebsiteScanResultUpdater } from '../runner/website-scan-result-updater';
import { ScanMetadata } from '../types/scan-metadata';
import { CrawlRunner } from './crawl-runner';

@injectable()
export class DeepScanner {
    constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(WebsiteScanResultUpdater) private readonly websiteScanResultUpdater: WebsiteScanResultUpdater,
        private readonly processUrls: DiscoveredUrlProcessor = processDiscoveredUrls,
        private readonly discoveryPatternGenerator: DiscoveryPatternFactory = getDiscoveryPatternForUrl,
    ) {}

    public async runDeepScan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult, page: Page): Promise<void> {
        const websiteScanResult = await this.readWebsiteScanResult(pageScanResult, 'deep-scan');

        const discoveryPatterns = websiteScanResult.discoveryPatterns ?? [this.discoveryPatternGenerator(websiteScanResult.baseUrl)];
        const discoveredUrls = await this.crawlRunner.run(scanMetadata.url, discoveryPatterns, page.getUnderlyingPage());
        const urlCrawlLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit;
        const processedUrls = this.processUrls(discoveredUrls, urlCrawlLimit, websiteScanResult.knownPages);

        this.websiteScanResultUpdater.updateWebsiteScanResultWithDiscoveredUrls(pageScanResult, processedUrls, discoveryPatterns);
    }

    private async readWebsiteScanResult(
        pageScanResult: OnDemandPageScanResult,
        scanGroupType: ScanGroupType
    ): Promise<WebsiteScanResult> {
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id);
    }
}
