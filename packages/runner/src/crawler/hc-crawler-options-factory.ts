import * as _ from 'lodash';
import * as node_url from 'url';
import { JSONLineExporter } from './hc-crawler';
import {
    CrawlerConnectOptions,
    CrawlerError,
    CrawlerLaunchOptions,
    CrawlerRequestOptions,
    CrawlerResult,
    CrawlerScanResult,
} from './hc-crawler-types';

export class HCCrawlerOptionsFactory {
    public createConnectOptions(url: string, browserWSEndpoint: string): CrawlerConnectOptions {
        const launchOptions = this.createLaunchOptions(url);
        const connectOptions = launchOptions as CrawlerConnectOptions;
        connectOptions.browserWSEndpoint = browserWSEndpoint;

        return connectOptions;
    }

    public createLaunchOptions(url: string): CrawlerLaunchOptions {
        const IGNORED_EXTENSIONS = /\.pdf|.js|.css|.svg|.png|.jpg|.jpeg|.gif|.json|.xml|.exe|.dmg|.zip|.war|.rar|.ico|.txt$/i;
        const scanResult: CrawlerScanResult[] = [];
        const allowedDomain = node_url.parse(url).hostname;

        return {
            exporter: new JSONLineExporter({
                file: `${__dirname}/crawl-trace-${new Date().valueOf()}.json`,
            }),
            maxDepth: 1,
            maxConcurrency: 1,
            obeyRobotsTxt: false,
            allowedDomains: [allowedDomain],
            retryCount: 1,
            preRequest: (options: CrawlerRequestOptions) => {
                let processUrl = true;
                if (options.url.indexOf('https://login.microsoftonline.com/') !== -1 || options.url.match(IGNORED_EXTENSIONS) !== null) {
                    processUrl = false;
                }
                cout(`[hc-crawl] ${processUrl ? 'Processing' : 'Skipping'} URL ${options.url}`);

                return processUrl;
            },
            onSuccess: (result: CrawlerResult) => {
                const links = new Set();
                if (!_.isNil(result.links)) {
                    result.links.forEach(link => {
                        if (node_url.parse(link).hostname === allowedDomain) {
                            links.add(link);
                            cout(`[hc-crawl] Found link ${link}`);
                        }
                    });
                }
                scanResult.push({
                    baseUrl: url,
                    scanUrl: result.response.url,
                    depth: result.depth,
                    links: Array.from(links),
                });
                cout(`[hc-crawl] Total links found ${links.size}`);
            },
            onError: (error: CrawlerError) => {
                cout(`[hc-crawl] Error processing URL ${url}`);
                cout(error);
            },
            scanResult: scanResult,
        };
    }
}
