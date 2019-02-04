import { Context } from '@azure/functions';
import { IncomingMessage } from 'http';
import { getCrawler, QueueItem } from './simple-crawler';

export class Crawler {
    constructor(private readonly getCrawlerCallback: typeof getCrawler) {}
    public async crawl(context: Context, url: string): Promise<void> {
        return new Promise(resolve => {
            const EXT_BLACKLIST = /\.pdf|.js|.css|.png|.jpg|.jpeg|.gif|.json|.xml|.exe|.dmg|.zip|.war|.rar|.ico|.txt$/i;
            context.log('Received url to crawl ', url);
            const crawlerInstance = this.getCrawlerCallback(url);
            const crawledUrls: string[] = [];
            crawlerInstance.maxDepth = 1;
            crawlerInstance.maxConcurrency = 5;
            crawlerInstance.interval = 1000;

            crawlerInstance.addFetchCondition(queueItem => !queueItem.path.match(EXT_BLACKLIST));

            context.log('Max Depth set to ', crawlerInstance.maxDepth);

            crawlerInstance.on('crawlstart', () => {
                context.log('Crawling started....');
            });

            crawlerInstance.on('queueerror', (error: Error, queueItem: QueueItem) => {
                context.log.error('Crawler got queueerror for queueItem ', queueItem);
                context.log.error('Crawler queueerror error response !', error);
            });

            crawlerInstance.on('fetchdataerror', (queueItem: QueueItem, response: IncomingMessage) => {
                context.log('Crawler got fetchdataerror for queueItem ', queueItem);
                context.log('Crawler fetchdataerror error response ', response);
            });

            crawlerInstance.on('fetchcomplete', (queueItem: QueueItem, responseBuffer: string | Buffer, response: IncomingMessage) => {
                context.log('fetchcomplete  for url %s', queueItem.url);
                crawledUrls.push(queueItem.url);
            });

            crawlerInstance.on('complete', () => {
                context.log('Complete -> Crawler Job is done for ', crawlerInstance.initialURL);
                crawlerInstance.stop();
                context.log('resolving promise');
                context.bindings.outputQueueItem = crawledUrls;
                resolve();
            });

            crawlerInstance.start();

            context.log('Scanner started.....');
        });
    }
}
