import { HCCrawler, HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerLaunchOptions } from './hc-crawler-types';

export class HCCrawlerFactory {
    public async createInstance(options: HCCrawlerLaunchOptions): Promise<HCCrawlerTyped> {
        return HCCrawler.launch(options);
    }
}
