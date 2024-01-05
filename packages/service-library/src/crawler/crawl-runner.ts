// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GlobalLogger } from 'logger';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { BatchConfig } from 'azure-services';
import { System } from 'common';
import { CrawlerOptions, PageCrawlerEngine } from '../crawler/page-crawler-engine';

@injectable()
export class CrawlRunner {
    private readonly storageDirName = 'crawler_storage';

    constructor(
        @inject(PageCrawlerEngine) private readonly pageCrawlerEngine: PageCrawlerEngine,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(BatchConfig) private readonly batchConfig: BatchConfig,
    ) {}

    public async run(baseUrl: string, discoveryPatterns: string[], page: Puppeteer.Page): Promise<string[] | undefined> {
        this.logger.logInfo('Starting web page crawling.');

        let result: string[] = [];
        try {
            const crawlerRunOptions: CrawlerOptions = {
                baseUrl,
                discoveryPatterns,
                baseCrawlPage: page,
                workingDirectory: this.getWorkingDirectory(),
            };

            result = await this.pageCrawlerEngine.start(crawlerRunOptions);
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

    private getWorkingDirectory(): string {
        return `${this.batchConfig.taskWorkingDir ?? __dirname}\\${this.storageDirName}`;
    }
}
