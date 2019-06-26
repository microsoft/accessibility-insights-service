// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger, loggerTypes } from 'logger';
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

@injectable()
export class HCCrawlerOptionsFactory {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {}

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
        const exporter = this.isDebug()
            ? new JSONLineExporter({
                  file: `${__dirname}/crawl-trace-${new Date().valueOf()}.json`,
              })
            : undefined;

        return {
            exporter: exporter,
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
                this.logger.logInfo(`[hc-crawl] ${processUrl ? 'Processing' : 'Skipping'} URL ${options.url}`);

                return processUrl;
            },
            onSuccess: (result: CrawlerResult) => {
                const links = new Set<string>();
                if (result.links !== undefined) {
                    result.links.forEach(link => {
                        if (node_url.parse(link).hostname === allowedDomain) {
                            links.add(link);
                            this.logger.logInfo(`[hc-crawl] Found link ${link}`);
                        }
                    });
                }
                scanResult.push({
                    baseUrl: url,
                    scanUrl: result.response.url,
                    depth: result.depth,
                    links: Array.from(links),
                });
                this.logger.logInfo(`[hc-crawl] Total links found ${links.size}`);
            },
            onError: (error: CrawlerError) => {
                scanResult.push({
                    baseUrl: url,
                    scanUrl: error.options.url,
                    depth: error.depth,
                    links: undefined,
                    error: error,
                });
                this.logger.logError(`[hc-crawl] Error processing URL ${url} - error - ${JSON.stringify(error)}`);
            },
            scanResult: scanResult,
        };
    }

    private isDebug(): boolean {
        return this.currentProcess.execArgv.filter(arg => arg.toLocaleLowerCase() === '--debug').length > 0;
    }
}
