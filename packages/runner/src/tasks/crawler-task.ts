// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { HCCrawler, HCCrawlerTyped } from '../crawler/hc-crawler';
import { HCCrawlerOptionsFactory } from '../crawler/hc-crawler-options-factory';
import { CrawlerConnectOptions } from '../crawler/hc-crawler-types';
import { LinkExplorer } from '../crawler/link-explorer';

export type LinkExplorerFactory = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions, logger: Logger) => LinkExplorer;

const linkExplorerFactoryImpl = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions, logger: Logger): LinkExplorer =>
    new LinkExplorer(crawler, connectOptions, logger);

@injectable()
export class CrawlerTask {
    constructor(
        @inject(HCCrawlerOptionsFactory) private readonly hcCrawlerOptionsFactory: HCCrawlerOptionsFactory,
        @inject(Logger) private readonly logger: Logger,
        private readonly linkExplorerFactory: LinkExplorerFactory = linkExplorerFactoryImpl,
    ) {}

    public async crawl(url: string, websiteUrl: string, browser: Browser): Promise<CrawlerScanResults> {
        const connectOptions = this.hcCrawlerOptionsFactory.createConnectOptions(url, websiteUrl, browser.wsEndpoint());
        const crawler = await HCCrawler.connect(connectOptions);
        const linkExplorer = this.linkExplorerFactory(crawler, connectOptions, this.logger);

        return linkExplorer.exploreLinks(url);
    }
}
