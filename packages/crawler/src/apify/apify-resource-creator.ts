// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import Apify from 'apify';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
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

    public async createRequestQueue(
        baseUrl: string,
        empty?: boolean,
        inputFile?: string,
        existingUrls?: string[],
    ): Promise<Apify.RequestQueue> {
        if (empty === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await this.apify.openRequestQueue(this.requestQueueName);
        await requestQueue.addRequest({ url: baseUrl.trim() });

        await this.addUrlsFromFile(requestQueue, inputFile);
        await this.addUrlsFromList(requestQueue, existingUrls);

        return requestQueue;
    }

    private async addUrlsFromFile(requestQueue: Apify.RequestQueue, inputFile?: string): Promise<void> {
        if (inputFile === undefined) {
            return Promise.resolve();
        }

        if (!this.filesystem.existsSync(inputFile)) {
            return Promise.resolve();
        }

        const lines = this.filesystem.readFileSync(inputFile, 'utf-8').split(/\r?\n/);

        await this.addUrlsFromList(requestQueue, lines);
    }

    private async addUrlsFromList(requestQueue: Apify.RequestQueue, existingUrls?: string[]): Promise<void> {
        if (existingUrls === undefined) {
            return Promise.resolve();
        }

        for (let url of existingUrls) {
            url = url.trim();
            if (!isEmpty(url)) {
                await requestQueue.addRequest({ url: url }, { forefront: true });
            }
        }
    }

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().APIFY_LOCAL_STORAGE_DIR;
        if (this.filesystem.existsSync(outputDir)) {
            this.filesystem.rmdirSync(outputDir, { recursive: true });
        }
    }
}
