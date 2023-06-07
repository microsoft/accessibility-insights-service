// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { isEmpty } from 'lodash';
import { SetRequired } from 'type-fest';
import { crawlerIocTypes } from '../types/ioc-types';
import { CrawlerRunOptions } from '..';
import { ApifyRequestQueueProvider } from '../apify/apify-request-queue-creator';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerEngine } from './crawler-engine';

@injectable()
export class PageCrawlerEngine implements CrawlerEngine<string[]> {
    public constructor(
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        private readonly browserCrawlerEnqueueLinks: typeof Crawlee.browserCrawlerEnqueueLinks = Crawlee.browserCrawlerEnqueueLinks,
    ) {}

    public async start(
        crawlerRunOptions: SetRequired<CrawlerRunOptions, 'baseUrl' | 'discoveryPatterns' | 'baseCrawlPage' | 'localOutputDir'>,
    ): Promise<string[]> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);

        const requestQueue = await this.requestQueueProvider();

        const enqueueLinksOptions = {
            options: {
                baseUrl: crawlerRunOptions.baseUrl,
                // eslint-disable-next-line security/detect-non-literal-regexp
                regexps: crawlerRunOptions.discoveryPatterns.map((p) => new RegExp(p)),
            },
            page: crawlerRunOptions.baseCrawlPage,
            requestQueue,
            originalRequestUrl: crawlerRunOptions.baseUrl,
        };
        const enqueued = await this.browserCrawlerEnqueueLinks(enqueueLinksOptions);
        console.log(`Discovered ${enqueued.processedRequests.length} new links on page ${crawlerRunOptions.baseCrawlPage.url()}`);

        const urls: string[] = [];
        let nextRequest;
        do {
            nextRequest = await requestQueue.fetchNextRequest();
            if (!isEmpty(nextRequest)) {
                urls.push(nextRequest.url);
            }
        } while (!isEmpty(nextRequest));

        return urls;
    }
}
