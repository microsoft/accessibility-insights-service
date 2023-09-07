// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider, RunnerScanMetadata } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { DiscoveredUrlProcessor, discoveredUrlProcessor } from '../crawl-runner/discovered-url-processor';
import { CrawlRunner } from '../crawl-runner/crawl-runner';
import { ScanFeedGenerator } from '../crawl-runner/scan-feed-generator';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';

@injectable()
export class DeepScanner {
    constructor(
        @inject(CrawlRunner) private readonly crawlRunner: CrawlRunner,
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly processUrls: DiscoveredUrlProcessor = discoveredUrlProcessor,
        private readonly createDiscoveryPatternFn: typeof createDiscoveryPattern = createDiscoveryPattern,
    ) {}

    public async runDeepScan(runnerScanMetadata: RunnerScanMetadata, pageScanResult: OnDemandPageScanResult, page: Page): Promise<void> {
        let websiteScanResult = await this.readWebsiteScanResult(pageScanResult, false);
        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
            deepScanId: websiteScanResult.deepScanId,
        });

        const deepScanDiscoveryLimit = websiteScanResult.deepScanLimit;
        const canDeepScan = await this.canDeepScan(websiteScanResult);
        if (canDeepScan === false) {
            this.logger.logInfo(`The website deep scan completed since maximum discovered pages limit was reached.`, {
                discoveredUrls: `${websiteScanResult.pageCount}`,
                discoveryLimit: `${deepScanDiscoveryLimit}`,
            });

            return;
        }

        // fetch websiteScanResult.knownPages from a storage
        websiteScanResult = await this.readWebsiteScanResult(pageScanResult, true);

        // crawl page if deep scan is requested
        let discoveredUrls: string[] = [];
        const discoveryPatterns = websiteScanResult.discoveryPatterns ?? [this.createDiscoveryPatternFn(websiteScanResult.baseUrl)];
        if (runnerScanMetadata.deepScan === true) {
            discoveredUrls = await this.crawlRunner.run(runnerScanMetadata.url, discoveryPatterns, page.puppeteerPage);
        }

        const processedUrls = this.processUrls(discoveredUrls, deepScanDiscoveryLimit, websiteScanResult.knownPages);
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

    private async readWebsiteScanResult(pageScanResult: OnDemandPageScanResult, readCompleteDocument: boolean): Promise<WebsiteScanResult> {
        const scanGroupType = 'deep-scan';
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id, readCompleteDocument);
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
