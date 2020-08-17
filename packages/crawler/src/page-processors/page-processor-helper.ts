// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Logger } from 'logger';
import { Page } from 'puppeteer';
import { ScanData } from '../scan-data';
import { BlobStore } from '../storage/store-types';

export type PartialScanData = {
    url: string;
    id: string;
} & Partial<ScanData>;

export class PageProcessorHelper {
    public constructor(
        private readonly logger: Logger,
        private readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
    ) {}

    public async enqueueLinks(
        page: Page,
        requestQueue: Apify.RequestQueue,
        discoveryPatterns?: string[],
    ): Promise<Apify.QueueOperationInfo[]> {
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue,
            pseudoUrls: discoveryPatterns,
        });
        this.logger.logInfo(`Discovered ${enqueued.length} links on page ${page.url()}`);

        return enqueued;
    }

    public async pushScanData(blobStore: BlobStore, scanData: PartialScanData): Promise<void> {
        const mergedScanData: ScanData = {
            succeeded: true,
            ...scanData,
        };
        await blobStore.setValue(`${scanData.id}.data`, mergedScanData);
    }

    // public async saveSnapshot(page: Page, id: string): Promise<void> {
    //     await Apify.utils.puppeteer.saveSnapshot(page, {
    //         key: `${id}.screenshot`,
    //         saveHtml: false,
    //         keyValueStoreName: scanResultStorageName,
    //     });
    // }
}
