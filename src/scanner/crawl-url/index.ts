import { Context } from '@azure/functions';
import { LinkedUrlFinder } from './linked-url-finder';
import { SimpleCrawler } from './simple-crawler';

export async function run(context: Context, url: string): Promise<void> {
    context.log('Received url to crawl ', url);
    const urlFinder = new LinkedUrlFinder(new SimpleCrawler(url));
    await urlFinder.find(context);
}
