// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { ResourceCreator } from '../types/resource-creator';

export class ApifyResourceCreator implements ResourceCreator {
    public constructor(private readonly apify: typeof Apify = Apify) {}

    public async createRequestQueue(baseUrl: string): Promise<Apify.RequestQueue> {
        const requestQueue = await this.apify.openRequestQueue();
        await requestQueue.addRequest({ url: baseUrl });

        return requestQueue;
    }

    public async createRequestList(existingUrls: string[]): Promise<Apify.RequestList> {
        return this.apify.openRequestList('existingUrls', existingUrls === undefined ? [] : existingUrls);
    }
}
