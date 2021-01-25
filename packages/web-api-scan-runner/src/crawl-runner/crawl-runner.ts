// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import { Crawler, iocTypes as crawlerIocTypes, SimpleCrawlerRunOptions } from 'accessibility-insights-crawler';
import { Page } from 'puppeteer';
import { ServiceConfiguration } from 'common';
import { ScanMetadataConfig } from '../scan-metadata-config';
type CrawlerProvider = () => Promise<Crawler<string[]>>;

@injectable()
export class CrawlRunner {
    constructor(
        @inject(crawlerIocTypes.CrawlerProvider) private readonly getCrawler: CrawlerProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(ScanMetadataConfig) scanMetadataConfig: ScanMetadataConfig,
    ) {
        const scanMetadata = scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id });
    }

    public async run(baseUrl: string, discoveryPatterns: string[], page: Page): Promise<string[] | undefined> {
        const crawler = await this.getCrawler();
        if (crawler == null) {
            this.logger.logInfo('No crawler provided by crawler provider');

            return undefined;
        }

        this.logger.logInfo('Starting web page crawling');

        let retVal: string[] | undefined;

        try {
            const crawlerRunOptions = {
                baseUrl,
                discoveryPatterns,
                page,
                maxRequestsPerCrawl: (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit,
            } as SimpleCrawlerRunOptions;

            retVal = await crawler.crawl(crawlerRunOptions);
        } catch (ex) {
            this.logger.logError('Failure while crawling web page', { error: JSON.stringify(ex) });

            return undefined;
        }

        this.logger.logInfo(`Web page crawling completed successfully. Found ${retVal ? retVal.length : 0} urls.`);

        return retVal;
    }
}
