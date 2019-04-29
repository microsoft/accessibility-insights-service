import { Logger } from 'logger';
import { CrawlerScanResults } from './crawler-scan-results';
import { HCCrawlerTyped } from './hc-crawler';
import { CrawlerLaunchOptions, CrawlerScanResult } from './hc-crawler-types';

export class LinkExplorer {
    constructor(
        private readonly crawler: HCCrawlerTyped,
        private readonly crawlerOptions: CrawlerLaunchOptions,
        private readonly logger: Logger,
    ) {}

    public async exploreLinks(url: string): Promise<CrawlerScanResults> {
        this.logger.logInfo(`[crawler] Starting scanning URL ${url}.`);
        await this.crawler.queue(url);
        await this.crawler.onIdle(); // Resolved when no queue item is left
        await this.crawler.disconnect();
        this.logger.logInfo(`[crawler] Scanning of URL ${url} completed.`);

        const scanResult = this.crawlerOptions.scanResult;
        const aggregateError = this.aggregateErrors(scanResult);
        if (aggregateError !== undefined) {
            this.logger.logInfo(`[crawler] ${aggregateError}`);
        }

        return { results: scanResult, error: aggregateError };
    }

    private aggregateErrors(scanResult: CrawlerScanResult[]): string {
        const failedScanResults = scanResult.filter(result => result.error !== undefined);
        const errors: string[] = [];
        if (failedScanResults !== undefined) {
            failedScanResults.map(result => {
                errors.push(`An error occurred while crawl website page ${result.scanUrl}. ${result.error.message}`);
            });
        }

        return errors.length > 0 ? errors.join('\n') : undefined;
    }
}
