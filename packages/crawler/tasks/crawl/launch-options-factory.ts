import * as url from 'url';
import { CrawlerLaunchOptions, CrawlerRequestOptions, CrawlerResult, HCCrawlerError } from './hc-crawler-types';

export class LaunchOptionsFactory {
    public create(crawlUrl: string): CrawlerLaunchOptions {
        const IGNORED_EXTENSIONS = /\.pdf|.js|.css|.svg|.png|.jpg|.jpeg|.gif|.json|.xml|.exe|.dmg|.zip|.war|.rar|.ico|.txt$/i;

        return {
            maxDepth: 1,
            maxConcurrency: 5,
            obeyRobotsTxt: false,
            allowedDomains: [url.parse(crawlUrl).hostname],
            retryCount: 1,
            preRequest: (options: CrawlerRequestOptions) => {
                if (options.url.indexOf('https://login.microsoftonline.com/') !== -1) {
                    return false;
                }

                return options.url.match(IGNORED_EXTENSIONS) === null;
            },
            onSuccess: (result: CrawlerResult) => {
                console.log(`onSuccess -> ${result.options.url}`);
            },
            onError: (error: HCCrawlerError) => {
                console.log(`onErros() recevied -> ${error}`);
            },
        };
    }
}
