// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Crawlee from '@crawlee/puppeteer';
import * as Puppeteer from 'puppeteer';
import normalizeUrl from 'normalize-url';
import { CrawlerConfiguration } from './crawler-configuration';
import { ApifyRequestQueueFactory } from './apify-request-queue-factory';

export interface CrawlerOptions {
    baseUrl: string;
    baseCrawlPage: Puppeteer.Page;
    discoveryPatterns: string[];
    workingDirectory: string;
}

@injectable()
export class PageCrawlerEngine {
    public constructor(
        @inject(ApifyRequestQueueFactory) private readonly apifyRequestQueueFactory: ApifyRequestQueueFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        private readonly browserCrawlerEnqueueLinks: typeof Crawlee.browserCrawlerEnqueueLinks = Crawlee.browserCrawlerEnqueueLinks,
    ) {}

    public async start(crawlerOptions: CrawlerOptions): Promise<string[]> {
        this.crawlerConfiguration.setApifySettings(crawlerOptions.workingDirectory);

        const requestQueue = await this.apifyRequestQueueFactory.createRequestQueue();
        const enqueueLinksOptions = {
            options: {
                baseUrl: crawlerOptions.baseUrl,
                // eslint-disable-next-line security/detect-non-literal-regexp
                regexps: crawlerOptions.discoveryPatterns.map((p) => new RegExp(p)),
            },
            page: crawlerOptions.baseCrawlPage,
            requestQueue,
            originalRequestUrl: crawlerOptions.baseUrl,
        };

        await this.browserCrawlerEnqueueLinks(enqueueLinksOptions);

        const urls: string[] = [];
        let nextRequest;
        do {
            nextRequest = await requestQueue.fetchNextRequest();
            if (!isEmpty(nextRequest)) {
                const url = this.normalizeUrl(nextRequest.url);
                urls.push(url);
            }
        } while (!isEmpty(nextRequest));

        return urls;
    }

    /**
     * [Normalizes](https://en.wikipedia.org/wiki/URL_normalization) crawled URL.
     */
    private normalizeUrl(url: string): string {
        const options: normalizeUrl.Options = {
            normalizeProtocol: false,
            stripHash: true,
            stripTextFragment: true,
            stripWWW: false,
        };

        return normalizeUrl(url, options);
    }
}
