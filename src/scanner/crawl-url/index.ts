import { Context } from '@azure/functions';
import { LinkedUrlFinder } from './linked-url-finder';
import { CrawlRequest, SimpleCrawler } from './simple-crawler';

export async function run(context: Context, crawlRequest: CrawlRequest): Promise<void> {
    context.log('Received url %s to crawl with ServiceTreeId %s', crawlRequest.baseUrl, crawlRequest.serviceTreeId);
    const urlFinder = new LinkedUrlFinder(new SimpleCrawler(crawlRequest.baseUrl), crawlRequest);
    await urlFinder.find(context);
}
