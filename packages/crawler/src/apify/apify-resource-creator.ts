// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import Apify from 'apify';
import { injectable } from 'inversify';
import { ApifySettingsHandler, apifySettingsHandler } from '../apify/apify-settings';
import { ResourceCreator } from '../types/resource-creator';

/* eslint-disable */

@injectable()
export class ApifyResourceCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        private readonly apify: typeof Apify = Apify,
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
        private readonly filesystem: typeof fs = fs,
    ) {}

    public async createRequestQueue(baseUrl: string, clear?: boolean, inputUrls?: string[]): Promise<Apify.RequestQueue> {
        if (clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await this.apify.openRequestQueue(this.requestQueueName);
        await this.addUrlsFromList(requestQueue, inputUrls);
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim() });
        }

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

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().APIFY_LOCAL_STORAGE_DIR;
        if (this.filesystem.existsSync(outputDir)) {
            this.filesystem.rmdirSync(outputDir, { recursive: true });
        }
    }
}
