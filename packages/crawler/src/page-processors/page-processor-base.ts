// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { BrowserError, PageNavigator } from 'scanner-global-library';
import { System } from 'common';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
import { ApifyRequestQueueProvider, crawlerIocTypes } from '../types/ioc-types';
import { ScanData } from '../types/scan-data';

/* eslint-disable no-invalid-this */

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
    public readonly gotoTimeoutMsecs = 30000;
    public readonly pageRenderingTimeoutMsecs = 5000;

    protected readonly baseUrl: string;
    protected readonly snapshot: boolean;
    protected readonly discoverLinks: boolean;
    protected readonly discoveryPatterns: string[];

    private scanMetadataSaved: boolean;

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
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(PageNavigator) protected readonly pageNavigator: PageNavigator,
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerConfiguration) protected readonly crawlerConfiguration: CrawlerConfiguration,
        protected readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly saveSnapshotExt: typeof Apify.utils.puppeteer.saveSnapshot = Apify.utils.puppeteer.saveSnapshot,
    ) {
        this.baseUrl = this.crawlerConfiguration.baseUrl();
        this.snapshot = this.crawlerConfiguration.snapshot();
        this.discoverLinks = this.crawlerConfiguration.crawl();
        this.discoveryPatterns = this.crawlerConfiguration.discoveryPatterns();
    }

    /**
     * Function that is called to process each request.
     */
    public pageHandler: Apify.PuppeteerHandlePage = async (inputs: Apify.PuppeteerHandlePageInputs) => {
        try {
            await this.processPage(inputs);
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: inputs.request.id as string, url: inputs.request.url });
            await this.logPageError(inputs.request, err as Error);
            await this.saveRunError(inputs.request, err);

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        }
    };

    /**
     * Overrides the function that opens the page in Puppeteer.
     * Return the result of Puppeteer's [page.goto()](https://pptr.dev/#?product=Puppeteer&show=api-pagegotourl-options) function.
     */
    public gotoFunction: Apify.PuppeteerGoto = async (inputs: Apify.PuppeteerGotoInputs) => {
        let navigationError: BrowserError;
        let runError: unknown;
        try {
            return await this.pageNavigator.navigate(inputs.request.url, inputs.page, async (browserError, error) => {
                if (error !== undefined) {
                    throw error;
                } else {
                    navigationError = browserError;
                }
            });
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: inputs.request.id as string, url: inputs.request.url });
            await this.logPageError(inputs.request, err as Error);
            runError = err;

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        } finally {
            if (runError !== undefined) {
                await this.saveRunError(inputs.request, runError);
            } else if (navigationError !== undefined) {
                await this.saveBrowserError(inputs.request, navigationError);
            } else {
                await this.saveScanMetadata(inputs.request.url, await inputs.page.title());
            }
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
        await this.saveRunError(request, error);
    };

    protected async saveSnapshot(page: Page, id: string): Promise<void> {
        if (this.snapshot) {
            await this.saveSnapshotExt(page, {
                key: `${id}.screenshot`,
                saveHtml: false,
                keyValueStoreName: scanResultStorageName,
            });
        }
    }

    protected async enqueueLinks(page: Page): Promise<Apify.QueueOperationInfo[]> {
        if (!this.discoverLinks) {
            return [];
        }

        const requestQueue = await this.requestQueueProvider();
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue,
            pseudoUrls: this.discoveryPatterns,
        });
        console.log(`Discovered ${enqueued.length} links on page ${page.url()}`);

        return enqueued;
    }

    protected async pushScanData(scanData: PartialScanData): Promise<void> {
        await this.blobStore.setValue(`${scanData.id}.data`, scanData);
    }

    protected async saveRunError(request: Apify.Request, error: unknown): Promise<void> {
        await this.dataBase.addScanResult(request.id as string, {
            id: request.id,
            url: request.url,
            scanState: 'runError',
            error: error !== undefined ? System.serializeError(error) : undefined,
        });
    }

    protected async saveBrowserError(request: Apify.Request, error: BrowserError): Promise<void> {
        await this.dataBase.addScanResult(request.id as string, {
            id: request.id,
            url: request.url,
            scanState: 'browserError',
            error: error !== undefined ? JSON.stringify(error) : undefined,
        });
    }

    protected async saveScanResult(request: Apify.Request, issueCount: number, selector?: string): Promise<void> {
        // add CSS selector of simulated element as URL bookmark part
        const url = selector === undefined ? request.url : `${request.url}#selector|${selector}`;
        await this.dataBase.addScanResult(request.id as string, {
            id: request.id,
            url,
            scanState: issueCount > 0 ? 'fail' : 'pass',
            issueCount,
        });
    }

    protected async saveScanMetadata(url: string, pageTitle: string): Promise<void> {
        // save metadata for any url first to support the case when base url is not processed
        if ((this.baseUrl && this.baseUrl === url) || !this.scanMetadataSaved) {
            await this.dataBase.addScanMetadata({
                baseUrl: this.baseUrl,
                basePageTitle: this.baseUrl === url ? pageTitle : '',
                userAgent: this.pageNavigator.pageConfigurator.getUserAgent(),
                browserResolution: this.pageNavigator.pageConfigurator.getBrowserResolution(),
            });
            this.scanMetadataSaved = true;
        }
    }

    protected async logBrowserFailure(request: Apify.Request, browserError: BrowserError): Promise<void> {
        await this.blobStore.setValue(`${request.id}.browser.err`, `${browserError.stack}`, { contentType: 'text/plain' });
    }

    protected async logPageError(request: Apify.Request, error: Error): Promise<void> {
        await this.blobStore.setValue(`${request.id}.err`, `${error.stack}`, { contentType: 'text/plain' });
    }
}
