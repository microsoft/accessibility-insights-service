import { HCCrawlerTyped } from './hc-crawler';
import { CrawlerLaunchOptions, CrawlerScanResult } from './hc-crawler-types';

export class LinkExplorer {
    constructor(private readonly crawler: HCCrawlerTyped, private readonly crawlerOptions: CrawlerLaunchOptions) {}

    public async exploreLinks(baseUrl: string): Promise<CrawlerScanResult[]> {
        cout(`[crawler] Starting scanning URL ${baseUrl}.`);
        await this.crawler.queue(baseUrl);
        await this.crawler.onIdle(); // Resolved when no queue item is left
        await this.crawler.disconnect();
        cout(`[crawler] Scanning of URL ${baseUrl} completed.`);

        return this.crawlerOptions.scanResult;
    }
}
