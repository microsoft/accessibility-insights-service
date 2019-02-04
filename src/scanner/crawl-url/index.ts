import { Context } from '@azure/functions';
import { Crawler } from './crawler';
import { getCrawler } from './simple-crawler';

export async function run(context: Context, url: string): Promise<void> {
    const carwler = new Crawler(getCrawler);
    await carwler.crawl(context, url);
}
