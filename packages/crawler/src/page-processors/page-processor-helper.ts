// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Logger } from 'logger';
import { Page } from 'puppeteer';
import { ScanData } from '../scan-data';
import { LocalBlobStore } from '../storage/local-blob-store';
import { BlobStore, scanResultStorageName } from '../storage/store-types';

export class PageProcessorHelper {
    public constructor(
        private readonly requestQueue: Apify.RequestQueue,
        private readonly logger: Logger,
        private readonly discoveryPatterns?: string[],
        private readonly blobStore: BlobStore = new LocalBlobStore(scanResultStorageName),
        private readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
    ) {}

    public async enqueueLinks(page: Page): Promise<Apify.QueueOperationInfo[]> {
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue: this.requestQueue,
            pseudoUrls: this.discoveryPatterns,
        });
        this.logger.logInfo(`Discovered ${enqueued.length} links on page ${page.url()}`);

        return enqueued;
    }

    public async pushScanData(id: string, url: string, scanData?: Partial<ScanData>): Promise<void> {
        const mergedScanData: ScanData = {
            id,
            url,
            succeeded: true,
            ...scanData,
        };
        await this.blobStore.setValue(`${id}.data`, mergedScanData);
    }

    public async saveSnapshot(page: Page, id: string): Promise<void> {
        await Apify.utils.puppeteer.saveSnapshot(page, {
            key: `${id}.screenshot`,
            saveHtml: false,
            keyValueStoreName: scanResultStorageName,
        });
    }
}
