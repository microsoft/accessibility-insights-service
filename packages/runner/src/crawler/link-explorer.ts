import { VError } from 'verror';
import { CrawlerScanResults } from './crawler-scan-results';
import { HCCrawlerTyped } from './hc-crawler';
import { CrawlerLaunchOptions } from './hc-crawler-types';

export class LinkExplorer {
    constructor(private readonly crawler: HCCrawlerTyped, private readonly crawlerOptions: CrawlerLaunchOptions) {}

    public async exploreLinks(url: string): Promise<CrawlerScanResults> {
        try {
            cout(`[crawler] Starting scanning URL ${url}.`);
            await this.crawler.queue(url);
            await this.crawler.onIdle(); // Resolved when no queue item is left
            await this.crawler.disconnect();
            cout(`[crawler] Scanning of URL ${url} completed.`);

            return { results: this.crawlerOptions.scanResult };
        } catch (error) {
            const errorExt = new VError(<Error>error, `An error occurred while crawl website page ${url}.`);
            cout(`[crawler] ${errorExt}`);

            return { error: errorExt.message };
        }
    }
}
