import { inject, optional } from 'inversify';
import { Browser } from 'puppeteer';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { HCCrawler, HCCrawlerTyped } from '../crawler/hc-crawler';
import { HCCrawlerOptionsFactory } from '../crawler/hc-crawler-options-factory';
import { CrawlerConnectOptions } from '../crawler/hc-crawler-types';
import { LinkExplorer } from '../crawler/link-explorer';

export type LinkExplorerFactoryType = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions) => LinkExplorer;

const linkExplorerFactoryImpl = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions): LinkExplorer =>
    new LinkExplorer(crawler, connectOptions);

export class CrawlerTask {
    private readonly hcCrawlerOptionsFactory: HCCrawlerOptionsFactory;
    private readonly linkExplorerFactory: LinkExplorerFactoryType;

    constructor(
        @inject(HCCrawlerOptionsFactory) hcCrawlerOptionsFactory: HCCrawlerOptionsFactory,
        @inject(linkExplorerFactoryImpl)
        @optional()
        linkExplorerFactory: LinkExplorerFactoryType = linkExplorerFactoryImpl,
    ) {
        this.hcCrawlerOptionsFactory = hcCrawlerOptionsFactory;
        this.linkExplorerFactory = linkExplorerFactory;
    }

    public async crawl(url: string, browser: Browser): Promise<CrawlerScanResults> {
        const connectOptions = this.hcCrawlerOptionsFactory.createConnectOptions(url, browser.wsEndpoint());
        const crawler = await HCCrawler.connect(connectOptions);
        const linkExplorer = this.linkExplorerFactory(crawler, connectOptions);
        const crawlerResults = await linkExplorer.exploreLinks(url);

        return { results: <CrawlerResult[]>crawlerResults };
    }
}
