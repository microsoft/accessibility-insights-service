// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import { Crawler, CrawlerRunOptions, crawlerIocTypes } from 'accessibility-insights-crawler';
import * as Puppeteer from 'puppeteer';
import { BatchConfig } from 'azure-services';
import { System } from 'common';

type CrawlerFactory = () => Promise<Crawler<string[]>>;

@injectable()
export class CrawlRunner {
    private readonly storageDirName = 'crawler_storage';

    constructor(
        @inject(crawlerIocTypes.CrawlerFactory) private readonly getCrawler: CrawlerFactory,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
    ) {}

    public async run(baseUrl: string, discoveryPatterns: string[], page: Puppeteer.Page): Promise<string[] | undefined> {
        this.logger.logInfo('Starting web page crawling.');
        const crawler = await this.getCrawler();

        let result: string[] = [];
        try {
            const commonOptions = await this.getCommonCrawlOptions();
            const crawlerRunOptions: CrawlerRunOptions = {
                baseUrl,
                discoveryPatterns,
                baseCrawlPage: page,
                ...commonOptions,
            };

            result = await crawler.crawl(crawlerRunOptions);
        } catch (error) {
            this.logger.logError('Failure while crawling web page.', { error: System.serializeError(error) });

            return undefined;
        }

        this.logger.logInfo(`Crawler found ${result ? result.length : 0} urls on web page.`, {
            discoveryPatterns: JSON.stringify(discoveryPatterns),
            discoveredUrls: JSON.stringify(result),
            crawledUrl: page.url(),
        });

        return result;
    }

    private async getCommonCrawlOptions(): Promise<Partial<CrawlerRunOptions>> {
        const outputDir = `${this.batchConfig.taskWorkingDir ?? __dirname}\\${this.storageDirName}`;

        return {
            localOutputDir: outputDir,
            restartCrawl: true,
        };
    }
}
