// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import Apify from 'apify';
import { injectable } from 'inversify';
import { Page } from 'puppeteer';
import { ApifySettingsHandler, apifySettingsHandler } from '../apify/apify-settings';
import { RequestQueueOptions, ResourceCreator } from '../types/resource-creator';

@injectable()
export class ApifyResourceCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        private readonly apify: typeof Apify = Apify,
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
        private readonly filesystem: typeof fs = fs,
        private readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
    ) {}

    public async createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Apify.RequestQueue> {
        if (options?.clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await this.apify.openRequestQueue(this.requestQueueName);
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim() });
        }
        await this.addUrlsFromList(requestQueue, options?.inputUrls);
        await this.addUrlsDiscoveredInPage(requestQueue, options?.page, options?.discoveryPatterns);

        return requestQueue;
    }

    private async addUrlsFromList(requestQueue: Apify.RequestQueue, inputUrls?: string[]): Promise<void> {
        if (inputUrls === undefined) {
            return Promise.resolve();
        }

        for (const url of inputUrls) {
            await requestQueue.addRequest({ url: url }, { forefront: true });
        }
    }

    private async addUrlsDiscoveredInPage(requestQueue: Apify.RequestQueue, page?: Page, discoveryPatterns?: string[]): Promise<void> {
        if (page === undefined || discoveryPatterns === undefined) {
            return;
        }

        await this.enqueueLinksExt({
            page: page,
            requestQueue: requestQueue,
            pseudoUrls: discoveryPatterns?.length > 0 ? discoveryPatterns : undefined, // prevents from crawling all links
        });
    }

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().APIFY_LOCAL_STORAGE_DIR;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (this.filesystem.existsSync(outputDir)) {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            this.filesystem.rmdirSync(outputDir, { recursive: true });
        }
    }
}
