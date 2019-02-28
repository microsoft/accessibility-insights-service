import { HCCrawler, HCCrawlerTyped } from './hc-crawler';
import { CrawlerLaunchOptions } from './hc-crawler-types';

export class HCCrawlerFactory {
    public async createInstance(options: CrawlerLaunchOptions): Promise<HCCrawlerTyped> {
        return HCCrawler.launch(options);
    }
}
