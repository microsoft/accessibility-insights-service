// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider, RunnerScanMetadata } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { CrawlRunner } from '../crawler/crawl-runner';
import { ScanFeedGenerator } from '../crawler/scan-feed-generator';
import { DiscoveredUrlProcessor } from '../crawler/discovered-url-processor';

@injectable()
export class DeepScanner {
    constructor(
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(DiscoveredUrlProcessor) private readonly discoveredUrlProcessor: DiscoveredUrlProcessor,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async runDeepScan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
        page: Page,
    ): Promise<void> {
        if (websiteScanResult === undefined || pageScanResult.websiteScanRef?.scanGroupType === 'single-scan') {
            return;
        }

        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
            deepScanId: websiteScanResult.deepScanId,
        });

        const deepScanDiscoveryLimit = websiteScanResult.deepScanLimit;
        const canDeepScan = await this.canDeepScan(websiteScanResult);
        if (canDeepScan === false) {
            this.logger.logInfo(`The website deep scan completed since maximum pages limit was reached.`, {
                discoveredUrls: `${websiteScanResult.pageCount}`,
                discoveryLimit: `${deepScanDiscoveryLimit}`,
            });

            return;
        }

        // crawling a page if deep scan was enabled
        let discoveredUrls: string[] = [];
        const discoveryPatterns = websiteScanResult.discoveryPatterns ?? [this.createDiscoveryPatternFn(websiteScanResult.baseUrl)];
        if (runnerScanMetadata.deepScan === true) {
            discoveredUrls = await this.crawlRunner.run(runnerScanMetadata.url, discoveryPatterns, page.puppeteerPage);
        }

        // fetch websiteScanResult.knownPages from a storage
        const websiteScanResultExpanded = await this.websiteScanResultProvider.read(websiteScanResult.id, true);
        const processedUrls = this.discoveredUrlProcessor.process(
            discoveredUrls,
            deepScanDiscoveryLimit,
            websiteScanResultExpanded.knownPages,
        );
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

        return this.websiteScanResultProvider.mergeOrCreate(scanId, websiteScanResultUpdate, undefined, true);
    }

    private async canDeepScan(websiteScanResult: WebsiteScanResult): Promise<boolean> {
        const discoveryLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).deepScanDiscoveryLimit;

        // allow initial deep scan only when known pages over discover limit
        if (
            websiteScanResult.deepScanLimit > discoveryLimit &&
            (websiteScanResult.pageCount === undefined || websiteScanResult.pageCount === 0)
        ) {
            return true;
        }

        // allow deep scan if below discover limit
        if (websiteScanResult.pageCount === undefined || websiteScanResult.pageCount < discoveryLimit) {
            return true;
        }

        return false;
    }
}
