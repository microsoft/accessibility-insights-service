// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import { Crawler, CrawlerRunOptions, iocTypes as crawlerIocTypes } from 'accessibility-insights-crawler';
import { Page } from 'puppeteer';
import { ServiceConfiguration } from 'common';
import { BatchConfig } from 'azure-services';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { DiscoveredUrlProcessor, processDiscoveredUrls } from './process-discovered-urls';

type CrawlerProvider = () => Promise<Crawler<string[]>>;

@injectable()
export class CrawlRunner {
    private readonly storageDirName = 'crawler_storage';

    constructor(
        @inject(crawlerIocTypes.CrawlerProvider) private readonly getCrawler: CrawlerProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(ScanMetadataConfig) scanMetadataConfig: ScanMetadataConfig,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
        private readonly processUrls: DiscoveredUrlProcessor = processDiscoveredUrls,
    ) {
        const scanMetadata = scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id });
    }

    public async run(baseUrl: string, discoveryPatterns: string[], page: Page, knownUrls: string[]): Promise<string[] | undefined> {
        const crawler = await this.getCrawler();
        if (crawler == null) {
            this.logger.logInfo('No crawler provided by crawler provider');

            return undefined;
        }

        this.logger.logInfo('Starting web page crawling');

        let retVal: string[] | undefined;

        const urlCrawlLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit;
        try {
            const commonOptions = await this.getCommonCrawlOptions();
            const crawlerRunOptions: CrawlerRunOptions = {
                baseUrl,
                discoveryPatterns,
                baseCrawlPage: page,
                maxRequestsPerCrawl: urlCrawlLimit,
                ...commonOptions,
            };

            retVal = await crawler.crawl(crawlerRunOptions);
        } catch (ex) {
            this.logger.logError('Failure while crawling web page', { error: JSON.stringify(ex) });

            return undefined;
        }

        this.logger.logInfo(`Web page crawling completed successfully. Found ${retVal ? retVal.length : 0} urls.`);

        return this.processUrls(retVal, urlCrawlLimit, knownUrls);
    }

    private getCommonCrawlOptions(): Partial<CrawlerRunOptions> {
        const outputDir = `${this.batchConfig.taskWorkingDir}/${this.storageDirName}`;

        return {
            localOutputDir: outputDir,
            silentMode: true,
            restartCrawl: true,
        };
    }
}
