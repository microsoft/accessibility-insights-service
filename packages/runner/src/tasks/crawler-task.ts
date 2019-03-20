import { Browser } from 'puppeteer';
import { HCCrawler, HCCrawlerTyped } from '../crawler/hc-crawler';
import { HCCrawlerOptionsFactory } from '../crawler/hc-crawler-options-factory';
import { CrawlerConnectOptions } from '../crawler/hc-crawler-types';
import { LinkExplorer } from '../crawler/link-explorer';

export class CrawlerTask {
    constructor(
        private readonly hcCrawlerOptionsFactory = new HCCrawlerOptionsFactory(),
        private readonly linkExplorerFactory?: (crawler: HCCrawlerTyped, createConnectOptions: CrawlerConnectOptions) => LinkExplorer,
    ) {}

    public async crawl(url: string, browser: Browser): Promise<CrawlerResult[]> {
        const connectOptions = this.hcCrawlerOptionsFactory.createConnectOptions(url, browser.wsEndpoint());
        const hcCrawler = await HCCrawler.connect(connectOptions);
        const linkExplorer =
            this.linkExplorerFactory === undefined
                ? this.linkExplorerFactoryImpl(hcCrawler, connectOptions)
                : this.linkExplorerFactory(hcCrawler, connectOptions);
        const crawlerResult = await linkExplorer.exploreLinks(url);

        return crawlerResult as CrawlerResult[];
    }

    private readonly linkExplorerFactoryImpl = (crawler: HCCrawlerTyped, connectOptions: CrawlerConnectOptions) =>
        new LinkExplorer(crawler, connectOptions);
}
