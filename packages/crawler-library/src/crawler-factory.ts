// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Apify from 'apify';
import { RequestQueueBase } from './request-queue-base';
import { RequestQueueMemory } from './request-queue-memory';

export interface CrawlerFactory {
    createRequestList(existingUrls: string[]): Promise<Apify.RequestList>;
    createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue | RequestQueueBase>;
}

export class LocalApifyFactory implements CrawlerFactory {
    public async createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue | RequestQueueBase> {
        const requestQueue = await Apify.openRequestQueue('queueId-test');
        await requestQueue.addRequest({ url: baseUrl });

        return requestQueue;
    }

    public async createRequestList(existingUrls: string[]): Promise<Apify.RequestList> {
        return Apify.openRequestList('existingUrls', existingUrls === undefined ? [] : existingUrls);
    }
}

export class CloudApifyFactory implements CrawlerFactory {
    public async createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue | RequestQueueBase> {
        const requestQueue = new RequestQueueMemory();
        await requestQueue.addRequest({ url: baseUrl });

        return requestQueue;
    }

    public async createRequestList(existingUrls: string[]): Promise<Apify.RequestList> {
        return Apify.openRequestList('existingUrls', existingUrls === undefined ? [] : existingUrls);
    }
}
