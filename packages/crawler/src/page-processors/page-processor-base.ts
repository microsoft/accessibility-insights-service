// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { BrowserError, PageNavigationHooks } from 'scanner-global-library';
import { System } from 'common';
import { isArray } from 'lodash';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
import { ApifyRequestQueueProvider, crawlerIocTypes } from '../types/ioc-types';
import { ScanData } from '../types/scan-data';

/* eslint-disable no-invalid-this, @typescript-eslint/no-explicit-any */

export type PartialScanData = {
    url: string;
    id: string;
} & Partial<ScanData>;

export interface PageProcessor {
    pageHandler: Apify.PuppeteerHandlePage;
    pageErrorProcessor: Apify.HandleFailedRequest;
    preNavigation(crawlingContext: PuppeteerCrawlingContext, gotoOptions: any): Promise<void>;
    postNavigation(crawlingContext: PuppeteerCrawlingContext): Promise<void>;
}

export type PuppeteerCrawlingContext = Apify.CrawlingContext & { page: Puppeteer.Page };
export type PuppeteerHandlePageInputs = Apify.CrawlingContext & Apify.BrowserCrawlingContext & Apify.PuppeteerHandlePageFunctionParam;

export interface SessionData {
    requestId: string;
    browserError: BrowserError;
}

@injectable()
export abstract class PageProcessorBase implements PageProcessor {
    protected readonly baseUrl: string;

    protected readonly snapshot: boolean;

    protected readonly discoverLinks: boolean;

    protected readonly discoveryPatterns: string[];

    private scanMetadataSaved: boolean;

    /**
     * Function that is called to process each request.
     */
    public pageHandler: Apify.PuppeteerHandlePage = async (inputs: PuppeteerHandlePageInputs) => {
        try {
            if (
                isArray(inputs.session?.userData) &&
                (inputs.session.userData as SessionData[]).find((s) => s.requestId === inputs.request.id)
            ) {
                return;
            }

            await this.processPage(inputs);
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: inputs.request.id as string, url: inputs.request.url });
            await this.logPageError(inputs.request, err as Error);
            await this.saveRunError(inputs.request, err);

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        }
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public preNavigation = async (crawlingContext: PuppeteerCrawlingContext, gotoOptions: any): Promise<void> => {
        if (!isArray(crawlingContext.session.userData)) {
            crawlingContext.session.userData = [];
        }
        await this.pageNavigationHooks.preNavigation(crawlingContext.page);
    };

    public postNavigation = async (crawlingContext: PuppeteerCrawlingContext): Promise<void> => {
        let navigationError: BrowserError;
        let runError: unknown;
        try {
            await this.pageNavigationHooks.postNavigation(
                crawlingContext.page,
                crawlingContext.response,
                async (browserError: BrowserError, error?: unknown) => {
                    if (error !== undefined) {
                        throw error;
                    } else {
                        navigationError = browserError;
                    }
                },
            );
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: crawlingContext.request.id as string, url: crawlingContext.request.url });
            await this.logPageError(crawlingContext.request, err as Error);
            runError = err;

            // Throw the error so Apify puts it back into the queue to retry
            throw err;
        } finally {
            if (runError !== undefined) {
                await this.saveRunError(crawlingContext.request, runError);
            } else if (navigationError !== undefined) {
                await this.saveBrowserError(crawlingContext.request, navigationError, crawlingContext.session);
            } else {
                await this.saveScanMetadata(crawlingContext.request.url, crawlingContext.page);
            }
        }
    };

    /**
     * This function is called when the crawling of a request failed after several reties
     */
    public pageErrorProcessor: Apify.HandleFailedRequest = async ({ request, error, session }: Apify.HandleFailedRequestInput) => {
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

    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(PageNavigationHooks) protected readonly pageNavigationHooks: PageNavigationHooks,
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
     * This function is called to extract data from a single web page
     * 'page' is an instance of Puppeteer.Page with page.goto(request.url) already called
     * 'request' is an instance of Request class with information about the page to load
     */
    protected abstract processPage: Apify.PuppeteerHandlePage;

    protected async saveSnapshot(page: Puppeteer.Page, id: string): Promise<void> {
        if (this.snapshot) {
            await this.saveSnapshotExt(page, {
                key: `${id}.screenshot`,
                saveHtml: false,
                keyValueStoreName: scanResultStorageName,
            });
        }
    }

    protected async enqueueLinks(page: Puppeteer.Page): Promise<Apify.QueueOperationInfo[]> {
        if (!this.discoverLinks) {
            return [];
        }

        const requestQueue = await this.requestQueueProvider();
        const enqueued = await this.enqueueLinksExt({
            page,
            requestQueue,
            pseudoUrls: this.discoveryPatterns?.length > 0 ? this.discoveryPatterns : undefined, // prevents from crawling all links
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

    protected async saveBrowserError(request: Apify.Request, error: BrowserError, session: Apify.Session): Promise<void> {
        (session.userData as SessionData[]).push({
            requestId: request.id,
            browserError: error,
        });
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

    protected async saveScanMetadata(url: string, page: Puppeteer.Page): Promise<void> {
        // save metadata for any url first to support the case when base url is not processed
        if ((this.baseUrl && this.baseUrl === url) || !this.scanMetadataSaved) {
            const pageTitle = await page.title();
            const browserResolution = await page.evaluate(() => {
                return {
                    width: window.innerWidth,
                    height: window.innerHeight,
                };
            });
            const userAgent = await page.browser().userAgent();
            await this.dataBase.addScanMetadata({
                baseUrl: this.baseUrl,
                basePageTitle: this.baseUrl === url ? pageTitle : '',
                userAgent,
                browserResolution: `${browserResolution.width}x${browserResolution.height}`,
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
