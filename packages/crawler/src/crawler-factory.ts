// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';

export interface CrawlerFactory {
    createRequestList(existingUrls: string[]): Promise<Apify.RequestList>;
    createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue>;
    createPuppeteerCrawler(options: Apify.PuppeteerCrawlerOptions): Apify.PuppeteerCrawler;
}

export class ApifyFactory implements CrawlerFactory {
    public async createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue> {
        const requestQueue = await Apify.openRequestQueue();
        await requestQueue.addRequest({ url: baseUrl });

        return requestQueue;
    }

    public async createRequestList(existingUrls: string[]): Promise<Apify.RequestList> {
        return Apify.openRequestList('existingUrls', existingUrls === undefined ? [] : existingUrls);
    }

    public createPuppeteerCrawler(options: Apify.PuppeteerCrawlerOptions): Apify.PuppeteerCrawler {
        return new Apify.PuppeteerCrawler(options);
    }
}
