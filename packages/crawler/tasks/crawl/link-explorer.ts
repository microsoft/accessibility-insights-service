import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerFactory } from './hc-crawler-factory';
import { LaunchOptionsFactory } from './launch-options-factory';

export class LinkExplorer {
    constructor(private readonly crawlerFactory: HCCrawlerFactory, private readonly launchOptionsFactory: LaunchOptionsFactory) {}
    public async exploreLinks(urlToExploreLink: string): Promise<string[]> {
        const crawlerOptions = this.launchOptionsFactory.create(urlToExploreLink);

        const crawler: HCCrawlerTyped = await this.crawlerFactory.createInstance(crawlerOptions);
        await crawler.queue(urlToExploreLink);
        await crawler.onIdle(); // Resolved when no queue item is left
        await crawler.close();
        this.throwIfCrawlFailed(urlToExploreLink, crawlerOptions.foundUrls);

        return crawlerOptions.foundUrls;
    }

    private throwIfCrawlFailed(baseUrlToExplorer: string, foundUrls: string[]): void {
        if (foundUrls.length === 0) {
            // nothing crawled
            throw new Error(`Explorer did not explore any links originated from ${baseUrlToExplorer}`);
        }
    }
}
