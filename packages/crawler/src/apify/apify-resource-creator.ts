// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import * as Crawlee from '@crawlee/puppeteer';
import { ApifySettingsHandler, apifySettingsHandler } from '../apify/apify-settings';

/* eslint-disable security/detect-non-literal-fs-filename */

export type RequestQueueOptions = {
    clear?: boolean;
    inputUrls?: string[];
    page?: Puppeteer.Page;
    discoveryPatterns?: string[]; // Only needed if page is provided
};

export interface ResourceCreator {
    createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue>;
}

@injectable()
export class ApifyResourceCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue> {
        if (options?.clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await Crawlee.RequestQueue.open(this.requestQueueName);
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim() });
        }
        await this.addUrlsFromList(requestQueue, options?.inputUrls);
        await this.addUrlsDiscoveredInPage(requestQueue, options?.page, options?.discoveryPatterns);

        return requestQueue;
    }

    private async addUrlsFromList(requestQueue: Crawlee.RequestQueue, inputUrls?: string[]): Promise<void> {
        if (inputUrls === undefined) {
            return;
        }

        for (const url of inputUrls) {
            await requestQueue.addRequest({ url: url }, { forefront: true });
        }
    }

    private async addUrlsDiscoveredInPage(
        requestQueue: Crawlee.RequestQueue,
        page?: Puppeteer.Page,
        discoveryPatterns?: string[],
    ): Promise<void> {
        if (page === undefined || discoveryPatterns === undefined) {
            return;
        }

        // TODO validate applicability of this workflow
        throw new Error('Not implemented');
    }

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().APIFY_LOCAL_STORAGE_DIR;
        if (this.filesystem.existsSync(outputDir)) {
            this.filesystem.rmSync(outputDir, { recursive: true });
        }
    }
}
