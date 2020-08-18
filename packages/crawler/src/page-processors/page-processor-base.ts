// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ScanData } from '../scan-data';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
import { PageProcessorHelper } from './page-processor-helper';

export interface PageProcessorOptions {
    baseUrl: string;
    requestQueue: Apify.RequestQueue;
    discoveryPatterns?: string[];
    simulate?: boolean;
    selectors?: string[];
}

export interface PageProcessor {
    pageProcessor: Apify.PuppeteerHandlePage;
    gotoFunction: Apify.PuppeteerGoto;
    pageErrorProcessor: Apify.HandleFailedRequest;
}

export abstract class PageProcessorBase implements PageProcessor {
    /**
     * This function is called to extract data from a single web page
     * 'page' is an instance of Puppeteer.Page with page.goto(request.url) already called
     * 'request' is an instance of Request class with information about the page to load
     */
    public abstract pageProcessor: Apify.PuppeteerHandlePage;

    /**
     * Timeout in which page navigation needs to finish, in seconds.
     */
    public gotoTimeoutSecs = 30;

    public constructor(
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly helper: PageProcessorHelper,
        protected readonly discoveryPatterns?: string[],
        protected readonly accessibilityScanOp: AccessibilityScanOperation = new AccessibilityScanOperation(),
        protected readonly dataStore: DataStore = new LocalDataStore(scanResultStorageName),
        protected readonly blobStore: BlobStore = new LocalBlobStore(scanResultStorageName),
        private readonly gotoExtended: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
    ) {}

    /**
     * Overrides the function that opens the page in Puppeteer.
     * Return the result of Puppeteer's [page.goto()](https://pptr.dev/#?product=Puppeteer&show=api-pagegotourl-options) function.
     */
    public gotoFunction: Apify.PuppeteerGoto = async (inputs: Apify.PuppeteerGotoInputs) => {
        return this.gotoExtended(inputs.page, inputs.request, {
            waitUntil: 'networkidle0',
            timeout: this.gotoTimeoutSecs * 1000,
        });
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
    };
}
