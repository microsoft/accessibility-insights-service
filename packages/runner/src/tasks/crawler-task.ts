import { inject } from 'inversify';
import { Browser } from 'puppeteer';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { HCCrawler, HCCrawlerTyped } from '../crawler/hc-crawler';
import { HCCrawlerOptionsFactory } from '../crawler/hc-crawler-options-factory';
import { CrawlerConnectOptions } from '../crawler/hc-crawler-types';
import { LinkExplorer } from '../crawler/link-explorer';

export type LinkExplorerFactory = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions) => LinkExplorer;

const linkExplorerFactoryImpl = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions): LinkExplorer =>
    new LinkExplorer(crawler, connectOptions);

export class CrawlerTask {
    constructor(
        @inject(HCCrawlerOptionsFactory) private readonly hcCrawlerOptionsFactory: HCCrawlerOptionsFactory,
        private readonly linkExplorerFactory: LinkExplorerFactory = linkExplorerFactoryImpl,
    ) {}

    public async crawl(url: string, browser: Browser): Promise<CrawlerScanResults> {
        const connectOptions = this.hcCrawlerOptionsFactory.createConnectOptions(url, browser.wsEndpoint());
        const crawler = await HCCrawler.connect(connectOptions);
        const linkExplorer = this.linkExplorerFactory(crawler, connectOptions);

        return linkExplorer.exploreLinks(url);
    }
}
