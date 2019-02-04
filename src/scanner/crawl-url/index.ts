import { Context } from '@azure/functions';
import { Crawler } from './crawler';
import { SimpleCrawler } from './simple-crawler';

export async function run(context: Context, url: string): Promise<void> {
    const carwler = new Crawler(new SimpleCrawler());
    await carwler.crawl(context, url);
}
