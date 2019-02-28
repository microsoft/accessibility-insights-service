import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { CrawlerRequestOptions } from './hc-crawler-types';
import { LaunchOptionsFactory } from './launch-options-factory';

export class LinkExplorer {
    private crawlUrlCount: number;
    constructor(private readonly crawlerFactory: HCCrawlerFactory, private readonly launchOptionsFactory: LaunchOptionsFactory) {}
    public async exploreLinks(urlToExploreLinks: string): Promise<void> {
        const crawler: HCCrawlerTyped = await this.crawlerFactory.createInstance(this.launchOptionsFactory.create(urlToExploreLinks));
        this.crawlUrlCount = 0;
        this.listenOncrawlerEvents(crawler);

        await crawler.queue(urlToExploreLinks);
        await crawler.onIdle(); // Resolved when no queue item is left
        await crawler.close();
        await this.isCrawlingSucceeded(urlToExploreLinks);
    }

    private async isCrawlingSucceeded(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.crawlUrlCount === 0) {
                // nothing crawled
                reject(`Explorer did not explore any links originated from ${url}`);
            }
            resolve();
        });
    }

    private listenOncrawlerEvents(crawler: HCCrawlerTyped): void {
        crawler.on('requeststarted', (options: CrawlerRequestOptions) => {
            console.log(`Crawl Request started for url ${options.url}`);
        });
        crawler.on('requestfinished', (options: CrawlerRequestOptions) => {
            console.log(`Crawl Request finished for url ${options.url}`);
            this.crawlUrlCount = this.crawlUrlCount + 1;
        });
        crawler.on('requestskipped', (options: CrawlerRequestOptions) => {
            console.log(`Crawl Request Skipped for url ${options.url}`);
        });
        crawler.on('requestfailed', (error: Error) => {
            console.error(`Crawl Request failed with error ${error}`);
        });
    }
}
