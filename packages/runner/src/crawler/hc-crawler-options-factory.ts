// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { GlobalLogger, Logger, loggerTypes } from 'logger';
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
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {}

    public createConnectOptions(crawlUrl: string, websiteUrl: string, browserWSEndpoint: string): CrawlerConnectOptions {
        const launchOptions = this.createLaunchOptions(crawlUrl, websiteUrl);
        const connectOptions = launchOptions as CrawlerConnectOptions;
        connectOptions.browserWSEndpoint = browserWSEndpoint;

        return connectOptions;
    }

    public createLaunchOptions(crawlUrl: string, websiteUrl: string): CrawlerLaunchOptions {
        const scanResult: CrawlerScanResult[] = [];
        const allowedDomain = node_url.parse(websiteUrl).hostname;
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
                if (!this.isAllowedUrl(options.url, websiteUrl)) {
                    processUrl = false;
                }
                this.logger.logInfo(`[hc-crawl] ${processUrl ? 'Processing' : 'Skipping'} URL ${options.url}`);

                return processUrl;
            },
            onSuccess: (result: CrawlerResult) => {
                const links = new Set<string>();
                if (result.links !== undefined) {
                    result.links.forEach(link => {
                        if (this.isAllowedUrl(link, websiteUrl)) {
                            links.add(link);
                            this.logger.logInfo(`[hc-crawl] Found link ${link}`);
                        }
                    });
                }
                scanResult.push({
                    baseUrl: crawlUrl,
                    scanUrl: result.response.url,
                    depth: result.depth,
                    links: Array.from(links),
                });
                this.logger.logInfo(`[hc-crawl] Total links found ${links.size}`);
            },
            onError: (error: CrawlerError) => {
                scanResult.push({
                    baseUrl: crawlUrl,
                    scanUrl: error.options.url,
                    depth: error.depth,
                    links: undefined,
                    error: error,
                });
                this.logger.logError(`[hc-crawl] Error processing URL ${crawlUrl} - error - ${JSON.stringify(error)}`);
            },
            scanResult: scanResult,
        };
    }

    private isDebug(): boolean {
        return this.currentProcess.execArgv.filter(arg => arg.toLocaleLowerCase() === '--debug').length > 0;
    }

    private isAllowedUrl(url: string, websiteUrl: string): boolean {
        // tslint:disable-next-line: max-line-length
        const ignoredExtentions = /(\.pdf|\.js|\.css|\.svg|\.png|\.jpg|\.jpeg|\.gif|\.json|\.xml|\.exe|\.dmg|\.zip|\.war|\.rar|\.ico|\.txt|\.yaml)$/i;
        const allowedDomain = node_url.parse(websiteUrl).hostname;
        const allowedPath = node_url.parse(websiteUrl).pathname;
        const loginPageBaseUrl = 'https://login.microsoftonline.com/';

        return (
            node_url.parse(url).hostname === allowedDomain &&
            node_url.parse(url).pathname.startsWith(allowedPath) &&
            url.indexOf(loginPageBaseUrl) === -1 &&
            url.match(ignoredExtentions) === null
        );
    }
}
