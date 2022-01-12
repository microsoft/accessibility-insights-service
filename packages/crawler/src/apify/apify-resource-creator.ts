// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { RequestQueue } from 'apify';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { RequestQueueOptions, ResourceCreator } from '../types/resource-creator';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { ApifySdkWrapper } from './apify-sdk-wrapper';

@injectable()
export class ApifyResourceCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        @inject(ApifySdkWrapper) private readonly apifyWrapper: ApifySdkWrapper,
        @inject(CrawlerConfiguration) private readonly crawlerConfig: CrawlerConfiguration,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<RequestQueue> {
        if (options?.clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await this.apifyWrapper.openRequestQueue(this.requestQueueName);
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim() });
        }
        await this.addUrlsFromList(requestQueue, options?.inputUrls);
        await this.addUrlsDiscoveredInPage(requestQueue, options?.page, options?.discoveryPatterns);

        return requestQueue;
    }

    private async addUrlsFromList(requestQueue: RequestQueue, inputUrls?: string[]): Promise<void> {
        if (inputUrls === undefined) {
            return Promise.resolve();
        }

        for (const url of inputUrls) {
            await requestQueue.addRequest({ url: url }, { forefront: true });
        }
    }

    private async addUrlsDiscoveredInPage(requestQueue: RequestQueue, page?: Puppeteer.Page, discoveryPatterns?: string[]): Promise<void> {
        if (page === undefined || discoveryPatterns === undefined) {
            return;
        }

        await this.apifyWrapper.enqueueLinks({
            page: page,
            requestQueue: requestQueue,
            pseudoUrls: discoveryPatterns?.length > 0 ? discoveryPatterns : undefined, // prevents from crawling all links
        });
    }

    private clearRequestQueue(): void {
        const outputDir = this.crawlerConfig.localOutputDir();
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (this.filesystem.existsSync(outputDir)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            this.filesystem.rmdirSync(outputDir, { recursive: true });
        }
    }
}
