// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { ApifySettingsHandler, apifySettingsHandler } from './apify-settings';

/* eslint-disable security/detect-non-literal-fs-filename */

export type RequestQueueOptions = {
    clear?: boolean;
    inputUrls?: string[];
};

export type ApifyRequestQueueFactory = () => Promise<Crawlee.RequestQueue>;

export interface ResourceCreator {
    createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue>;
}

@injectable()
export class ApifyRequestQueueCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
        private readonly fileSystem: typeof fs = fs,
    ) {}

    public async createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue> {
        if (options?.clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await Crawlee.RequestQueue.open(this.requestQueueName);
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim(), skipNavigation: true });
        }
        await this.addUrlsFromList(requestQueue, options?.inputUrls);

        return requestQueue;
    }

    private async addUrlsFromList(requestQueue: Crawlee.RequestQueue, inputUrls?: string[]): Promise<void> {
        if (inputUrls === undefined) {
            return;
        }

        for (const url of inputUrls) {
            await requestQueue.addRequest({ url: url.trim(), skipNavigation: true }, { forefront: true });
        }
    }

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().CRAWLEE_STORAGE_DIR;
        if (this.fileSystem.existsSync(outputDir)) {
            this.fileSystem.rmSync(outputDir, { recursive: true });
        }
    }
}
