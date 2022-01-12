// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { Apify, QueueOperationInfo, RequestQueue, RequestTransform } from 'apify';
import _ from 'lodash';
import { injectable } from 'inversify';

export type EnqueueLinksOptions = {
    page?: Puppeteer.Page;
    limit?: number;
    requestQueue: RequestQueue;
    selector?: string;
    baseUrl?: string;
    pseudoUrls?:
        | string[]
        | {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any;
          }[]
        | undefined;
    transformRequestFunction?: RequestTransform | undefined;
};

export type EnqueueLinksByClickingElementsOptions = {
    page: Puppeteer.Page;
    requestQueue: RequestQueue;
    selector: string;
    pseudoUrls?:
        | (
              | string
              | RegExp
              | {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    [x: string]: any;
                }
          )[]
        | undefined;
    transformRequestFunction?: RequestTransform | undefined;
    waitForPageIdleSecs?: number | undefined;
    maxWaitForPageIdleSecs?: number | undefined;
};

export type SaveSnapshotOptions = {
    key?: string;
    screenshotQuality?: number;
    saveScreenshot?: boolean;
    saveHtml?: boolean;
    keyValueStoreName?: string;
};

@injectable()
export class ApifySdkWrapper {
    protected sdk: Apify;

    constructor(private readonly createApify: (options?: unknown) => Apify = (options) => new Apify(options)) {
        this.sdk = createApify();
    }

    public setMemoryMBytes(memoryMBytes: number): void {
        process.env.APIFY_MEMORY_MBYTES = `${memoryMBytes}`;
        this.updateSdk();
    }

    public setLocalStorageDir(localStorageDir: string): void {
        this.updateSdk({ localStorageDir });
    }

    public async openRequestQueue(requestQueueName: string): Promise<RequestQueue> {
        return this.sdk.openRequestQueue(requestQueueName);
    }

    public async enqueueLinks(options: EnqueueLinksOptions): Promise<QueueOperationInfo[]> {
        return this.sdk.utils.enqueueLinks(options);
    }

    public async saveSnapshot(page: Puppeteer.Page, options?: SaveSnapshotOptions): Promise<void> {
        return this.sdk.utils.puppeteer.saveSnapshot(page, options);
    }

    public async enqueueLinksByClickingElements(options: EnqueueLinksByClickingElementsOptions): Promise<QueueOperationInfo[]> {
        return this.sdk.utils.puppeteer.enqueueLinksByClickingElements(options);
    }

    private updateSdk(newOptions?: { [key: string]: string | number | boolean }): void {
        const apifyOptions = {
            ...Object.fromEntries(this.sdk.config.options),
            ...newOptions,
        };
        this.sdk = this.createApify(apifyOptions);
    }
}
