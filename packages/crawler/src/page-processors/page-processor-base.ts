// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SummaryScanError, SummaryScanResult } from 'accessibility-insights-report';
import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { DataBase, ScanError } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
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

    // tslint:disable-next-line: member-access

    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(DataBase) protected readonly dataBase: DataBase,
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly snapshot: boolean,
        protected readonly discoveryPatterns?: string[],
        protected readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly gotoExtended: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
        protected readonly saveSnapshotExt: typeof Apify.utils.puppeteer.saveSnapshot = Apify.utils.puppeteer.saveSnapshot,
    ) {}

    /**
     * Function that is called to process each request.
     */
    public pageHandler: Apify.PuppeteerHandlePage = async (inputs: Apify.PuppeteerHandlePageInputs) => {
        try {
            await this.processPage(inputs);
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: inputs.request.id as string, url: inputs.request.url });
            await this.logPageError(inputs.request, err as Error);
            await this.saveScanErrorToDataBase(inputs.request, err as Error);

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
            await inputs.page.setBypassCSP(true);

            return await this.gotoExtended(inputs.page, inputs.request, {
                waitUntil: 'networkidle0',
                timeout: this.gotoTimeoutSecs * 1000,
            });
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: inputs.request.id as string, url: inputs.request.url });
            await this.logPageError(inputs.request, err as Error);
            await this.saveScanBrowserErrorToDataBase(inputs.request, err as Error);

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
            issueCount: 0,
        };
        await this.dataStore.pushData(scanData);
        await this.pushScanData({ succeeded: false, id: request.id as string, url: request.url });
        await this.logPageError(request, error);
        await this.saveScanErrorToDataBase(request, error);
    };

    public async saveSnapshot(page: Page, id: string): Promise<void> {
        if (this.snapshot) {
            await this.saveSnapshotExt(page, {
                key: `${id}.screenshot`,
                saveHtml: false,
                keyValueStoreName: scanResultStorageName,
            });
        }
    }

    protected async enqueueLinks(page: Page): Promise<Apify.QueueOperationInfo[]> {
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue: this.requestQueue,
            pseudoUrls: this.discoveryPatterns,
        });
        console.log(`Discovered ${enqueued.length} links on page ${page.url()}`);

        return enqueued;
    }

    protected async pushScanData(scanData: PartialScanData): Promise<void> {
        await this.blobStore.setValue(`${scanData.id}.data`, scanData);
    }

    protected async saveScanBrowserErrorToDataBase(request: Apify.Request, error: Error): Promise<void> {
        const summaryScanError: SummaryScanError = {
            url: request.url,
            errorDescription: error.message,
            errorType: error.name,
            errorLogLocation: `key_value_stores/${scanResultStorageName}/${request.id}.error.txt`,
        };

        await this.dataBase.addBrowserError(request.id as string, summaryScanError);
    }

    protected async saveScanErrorToDataBase(request: Apify.Request, error: Error): Promise<void> {
        const summaryScanError: ScanError = {
            url: request.url,
            error: JSON.stringify(error),
        };

        await this.dataBase.addError(request.id as string, summaryScanError);
    }

    protected async saveScanResultToDataBase(request: Apify.Request, issueCount: number): Promise<void> {
        const summaryScanResult: SummaryScanResult = {
            numFailures: issueCount,
            url: request.url,
            reportLocation: `key_value_stores/${scanResultStorageName}/${request.id}.report.html`,
        };

        if (summaryScanResult.numFailures === 0) {
            await this.dataBase.addPass(request.id as string, summaryScanResult);
        } else {
            await this.dataBase.addFail(request.id as string, summaryScanResult);
        }
    }

    protected async logPageError(request: Apify.Request, error: Error): Promise<void> {
        await this.blobStore.setValue(`${request.id}.err`, `${error.stack}`, { contentType: 'text/plain' });
    }
}
