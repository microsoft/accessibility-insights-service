import { Context } from '@azure/functions';
import { LinkedUrlFinder } from './linked-url-finder';
import { CrawlRequest, SimpleCrawler } from './simple-crawler';

export async function run(context: Context, crawlRequest: CrawlRequest): Promise<void> {
    context.log('Received url to crawl ', crawlRequest.baseUrl);
    const urlFinder = new LinkedUrlFinder(new SimpleCrawler(crawlRequest.baseUrl));
    await urlFinder.find(context);
}
