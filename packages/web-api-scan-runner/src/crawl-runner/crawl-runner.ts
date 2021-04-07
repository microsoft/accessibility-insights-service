// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import { Crawler, CrawlerRunOptions, crawlerIocTypes } from 'accessibility-insights-crawler';
import { Page } from 'puppeteer';
import { BatchConfig } from 'azure-services';

type CrawlerProvider = () => Promise<Crawler<string[]>>;

@injectable()
export class CrawlRunner {
    private readonly storageDirName = 'crawler_storage';

    constructor(
        @inject(crawlerIocTypes.CrawlerProvider) private readonly getCrawler: CrawlerProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
    ) {}

    public async run(baseUrl: string, discoveryPatterns: string[], page: Page): Promise<string[] | undefined> {
        const crawler = await this.getCrawler();
        if (crawler == null) {
            this.logger.logInfo('No crawler instance created by crawler provider.');

            return undefined;
        }

        this.logger.logInfo('Starting web page crawling.');

        let result: string[] | undefined;
        try {
            const commonOptions = await this.getCommonCrawlOptions();
            const crawlerRunOptions: CrawlerRunOptions = {
                baseUrl,
                discoveryPatterns,
                baseCrawlPage: page,
                ...commonOptions,
            };

            result = await crawler.crawl(crawlerRunOptions);
        } catch (ex) {
            this.logger.logError('Failure while crawling web page.', { error: JSON.stringify(ex) });

            return undefined;
        }

        this.logger.logInfo(`Web page crawling completed successfully. Found ${result ? result.length : 0} urls.`);

        return result;
    }

    private async getCommonCrawlOptions(): Promise<Partial<CrawlerRunOptions>> {
        const outputDir = `${this.batchConfig.taskWorkingDir}/${this.storageDirName}`;

        return {
            // defines maximum number of links to discover on a page
            // the crawler will open only baseURL page per run
            maxRequestsPerCrawl: 1000,
            localOutputDir: outputDir,
            silentMode: true,
            restartCrawl: true,
        };
    }
}
