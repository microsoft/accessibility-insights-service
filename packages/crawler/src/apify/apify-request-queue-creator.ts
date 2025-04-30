// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable, optional } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { ApifySettingsHandler, apifySettingsHandler } from './apify-settings';

/* eslint-disable security/detect-non-literal-fs-filename */

export type RequestQueueOptions = {
    clear?: boolean;
    inputUrls?: string[];
    keepUrlFragment?: boolean;
    navigationTimeout?: number;
};

export type ApifyRequestQueueFactory = () => Promise<Crawlee.RequestQueue>;

export interface ResourceCreator {
    createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue>;
}

@injectable()
export class ApifyRequestQueueCreator implements ResourceCreator {
    private readonly requestQueueName = 'scanRequests';

    public constructor(
        @optional() @inject('ApifySettingsHandler') private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
        @optional() @inject('fs') private readonly fileSystem: typeof fs = fs,
    ) {}

    public async createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Crawlee.RequestQueue> {
        if (options?.clear === true) {
            this.clearRequestQueue();
        }

        const requestQueue = await Crawlee.RequestQueue.open(this.requestQueueName);
        const keepUrlFragment = this.getKeepUrlFragment(options?.keepUrlFragment);
        const navigationTimeout = this.getNavigationTimeout(options?.navigationTimeout);
        const userData = {
            keepUrlFragment: keepUrlFragment,
            navigationTimeout: navigationTimeout,
        } as Crawlee.Dictionary;
        if (baseUrl) {
            await requestQueue.addRequest({ url: baseUrl.trim(), skipNavigation: true, keepUrlFragment: keepUrlFragment, userData });
        }
        await this.addUrlsFromList(requestQueue, userData, options?.inputUrls);

        return requestQueue;
    }

    private async addUrlsFromList(requestQueue: Crawlee.RequestQueue, userData: Crawlee.Dictionary, inputUrls?: string[]): Promise<void> {
        if (inputUrls === undefined) {
            return;
        }

        for (const url of inputUrls) {
            await requestQueue.addRequest(
                { url: url.trim(), skipNavigation: true, keepUrlFragment: userData.keepUrlFragment, userData },
                { forefront: true },
            );
        }
    }

    private clearRequestQueue(): void {
        const outputDir = this.settingsHandler.getApifySettings().CRAWLEE_STORAGE_DIR;
        if (this.fileSystem.existsSync(outputDir)) {
            this.fileSystem.rmSync(outputDir, { recursive: true });
        }
    }

    private getKeepUrlFragment(keepUrlFragment?: boolean): boolean {
        return keepUrlFragment ?? false;
    }

    private getNavigationTimeout(navigationTimeout?: number): number {
        return navigationTimeout ?? 30000;
    }
}
