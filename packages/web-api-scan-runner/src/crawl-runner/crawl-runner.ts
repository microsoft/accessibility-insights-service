// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import { Crawler, CrawlerRunOptions, iocTypes as crawlerIocTypes } from 'accessibility-insights-crawler';
import { Page } from 'puppeteer';
import { ServiceConfiguration } from 'common';
import { BatchConfig } from 'azure-services';

type CrawlerProvider = () => Promise<Crawler<string[]>>;

@injectable()
export class CrawlRunner {
    private readonly storageDirName = 'crawler_storage';

    constructor(
        @inject(crawlerIocTypes.CrawlerProvider) private readonly getCrawler: CrawlerProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
    ) {}

    public async run(baseUrl: string, discoveryPatterns: string[], page: Page): Promise<string[] | undefined> {
        const crawler = await this.getCrawler();
        if (crawler == null) {
            this.logger.logInfo('No crawler provided by crawler provider');

            return undefined;
        }

        this.logger.logInfo('Starting web page crawling');

        let retVal: string[] | undefined;

        try {
            const commonOptions = await this.getCommonCrawlOptions();
            const crawlerRunOptions: CrawlerRunOptions = {
                baseUrl,
                discoveryPatterns,
                baseCrawlPage: page,
                ...commonOptions,
            };

            retVal = await crawler.crawl(crawlerRunOptions);
        } catch (ex) {
            this.logger.logError('Failure while crawling web page', { error: JSON.stringify(ex) });

            return undefined;
        }

        this.logger.logInfo(`Web page crawling completed successfully. Found ${retVal ? retVal.length : 0} urls.`);

        return retVal;
    }

    private async getCommonCrawlOptions(): Promise<Partial<CrawlerRunOptions>> {
        const urlCrawlLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit;
        const outputDir = `${this.batchConfig.taskWorkingDir}/${this.storageDirName}`;

        return {
            maxRequestsPerCrawl: urlCrawlLimit,
            localOutputDir: outputDir,
            silentMode: true,
            restartCrawl: true,
        };
    }
}
