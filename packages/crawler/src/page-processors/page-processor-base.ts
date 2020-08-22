// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore } from '../storage/store-types';
import { ScanData } from '../types/scan-data';

export type PartialScanData = {
    url: string;
    id: string;
} & Partial<ScanData>;

export interface PageProcessor {
    pageHandler: Apify.PuppeteerHandlePage;
    gotoFunction: Apify.PuppeteerGoto;
    pageErrorProcessor: Apify.HandleFailedRequest;
}

@injectable()
export abstract class PageProcessorBase implements PageProcessor {
    /**
     * Timeout in which page navigation needs to finish, in seconds.
     */
    public gotoTimeoutSecs = 30;

    /**
     * This function is called to extract data from a single web page
     * 'page' is an instance of Puppeteer.Page with page.goto(request.url) already called
     * 'request' is an instance of Request class with information about the page to load
     */
    protected abstract processPage: Apify.PuppeteerHandlePage;

    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns?: string[],
        private readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        private readonly gotoExtended: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
    ) {}

    public pageHandler: Apify.PuppeteerHandlePage = async (inputs: Apify.PuppeteerHandlePageInputs) => {
        try {
            await this.processPage(inputs);
        } catch (err) {
            await this.logPageError(inputs.request, err as Error);

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        }
    };

    /**
     * Overrides the function that opens the page in Puppeteer.
     * Return the result of Puppeteer's [page.goto()](https://pptr.dev/#?product=Puppeteer&show=api-pagegotourl-options) function.
     */
    public gotoFunction: Apify.PuppeteerGoto = async (inputs: Apify.PuppeteerGotoInputs) => {
        try {
            return await this.gotoExtended(inputs.page, inputs.request, {
                waitUntil: 'networkidle0',
                timeout: this.gotoTimeoutSecs * 1000,
            });
        } catch (err) {
            await this.logPageError(inputs.request, err as Error);

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        }
    };

    /**
     * This function is called when the crawling of a request failed after several reties
     */
    public pageErrorProcessor: Apify.HandleFailedRequest = async ({ request, error }: Apify.HandleFailedRequestInput) => {
        const scanData: ScanData = {
            id: request.id as string,
            url: request.url,
            succeeded: false,
            context: request.userData,
            error: JSON.stringify(error),
            requestErrors: request.errorMessages as string[],
        };
        await this.dataStore.pushData(scanData);
        await this.logPageError(request, error);
    };

    protected async enqueueLinks(page: Page): Promise<Apify.QueueOperationInfo[]> {
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue: this.requestQueue,
            pseudoUrls: this.discoveryPatterns,
        });
        this.logger.logInfo(`Discovered ${enqueued.length} links on page ${page.url()}`);

        return enqueued;
    }

    protected async pushScanData(scanData: PartialScanData): Promise<void> {
        const mergedScanData: ScanData = {
            succeeded: true,
            ...scanData,
        };
        await this.blobStore.setValue(`${scanData.id}.data`, mergedScanData);
    }

    protected async logPageError(request: Apify.Request, error: Error): Promise<void> {
        await this.blobStore.setValue(`${request.id}.err`, `Error at URL ${request.url}: ${error.message}`, { contentType: 'text/plain' });
    }

    // protected async saveSnapshot(page: Page, id: string): Promise<void> {
    //     await Apify.utils.puppeteer.saveSnapshot(page, {
    //         key: `${id}.screenshot`,
    //         saveHtml: false,
    //         keyValueStoreName: scanResultStorageName,
    //     });
    // }
}
