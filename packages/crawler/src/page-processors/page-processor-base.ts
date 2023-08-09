// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { BrowserError } from 'scanner-global-library';
import { System } from 'common';
import { isArray } from 'lodash';
import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
import { ScanData } from '../types/scan-data';
import { PageNavigatorFactory, crawlerIocTypes } from '../types/ioc-types';

/* eslint-disable no-invalid-this, @typescript-eslint/no-explicit-any */

export type PartialScanData = {
    url: string;
    id: string;
} & Partial<ScanData>;

export interface PageProcessor {
    requestHandler: Crawlee.PuppeteerRequestHandler;
    failedRequestHandler: Crawlee.BrowserErrorHandler;
}

export interface SessionData {
    requestId: string;
    browserError: BrowserError;
}

export type PageProcessorFactory = () => PageProcessorBase;

@injectable()
export abstract class PageProcessorBase implements PageProcessor {
    protected readonly baseUrl: string;

    protected readonly snapshot: boolean;

    protected readonly discoverLinks: boolean;

    protected readonly discoveryPatterns: string[];

    private scanMetadataSaved: boolean;

    /**
     * Function that is called for each URL to crawl.
     */
    public requestHandler: Crawlee.PuppeteerRequestHandler = async (context) => {
        let response;
        try {
            if (!isArray(context.session?.userData)) {
                context.session.userData = [];
            }

            if ((context.session.userData as SessionData[]).find((s) => s.requestId === context.request.id)) {
                return;
            }

            const pageNavigator = await this.pageNavigatorFactory();
            pageNavigator.logger.setCommonProperties({ requestId: context.request.id, url: context.request.url });

            response = await pageNavigator.navigate(context.request.url, context.page);
            if (response.browserError) {
                return;
            }

            await this.processPage(context);
        } catch (err) {
            await this.pushScanData({ succeeded: false, id: context.request.id as string, url: context.request.url });
            await this.logPageError(context.request, err as Error);
            await this.saveRunError(context.request, err);

            // Throw the error so Apify puts it back into the request queue to retry
            throw err;
        } finally {
            if (response?.browserError) {
                await this.saveBrowserError(context.request, response.browserError, context.session);
            } else {
                await this.saveScanMetadata(context.request.url, context.page);
            }
        }
    };

    /**
     * This function is called when the crawling of a request failed after several reties
     */
    public failedRequestHandler: Crawlee.BrowserErrorHandler = async ({ request }, error) => {
        const scanData: ScanData = {
            id: request.id as string,
            url: request.url,
            succeeded: false,
            context: request.userData,
            error: System.serializeError(error),
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
        @inject(CrawlerConfiguration) protected readonly crawlerConfiguration: CrawlerConfiguration,
        @inject(crawlerIocTypes.PageNavigatorFactory) protected readonly pageNavigatorFactory: PageNavigatorFactory,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
        protected readonly saveSnapshotExt: typeof Crawlee.puppeteerUtils.saveSnapshot = Crawlee.puppeteerUtils.saveSnapshot,
    ) {
        this.baseUrl = this.crawlerConfiguration.baseUrl();
        this.snapshot = this.crawlerConfiguration.snapshot();
        this.discoverLinks = this.crawlerConfiguration.crawl();
        this.discoveryPatterns = this.crawlerConfiguration.discoveryPatterns();
    }

    /**
     * This function is called to extract data from a single web page.
     */
    protected abstract processPage: Crawlee.PuppeteerRequestHandler;

    protected async saveSnapshot(page: Puppeteer.Page, id: string): Promise<void> {
        if (this.snapshot) {
            await this.saveSnapshotExt(page, {
                key: `${id}.screenshot`,
                saveHtml: false,
                keyValueStoreName: scanResultStorageName,
            });
        }
    }

    protected async enqueueLinks(context: Crawlee.PuppeteerCrawlingContext): Promise<void> {
        if (this.discoverLinks !== true) {
            return;
        }

        // Set actually loaded URL in crawler context. This is workaround of crawler bug the prevents
        // converting relative href link to absolute link.
        context.request.loadedUrl = context.page.url();

        const enqueued = await context.enqueueLinks({
            // eslint-disable-next-line security/detect-non-literal-regexp
            regexps: this.discoveryPatterns?.length > 0 ? this.discoveryPatterns.map((p) => new RegExp(p)) : undefined,
        });
        this.logger.logInfo(`Enqueued ${enqueued.processedRequests.length} new links.`, {
            url: context.page.url(),
        });
    }

    protected async pushScanData(scanData: PartialScanData): Promise<void> {
        await this.blobStore.setValue(`${scanData.id}.data`, scanData);
    }

    protected async saveRunError(request: Crawlee.Request, error: unknown): Promise<void> {
        await this.dataBase.addScanResult(request.id as string, {
            id: request.id,
            url: request.url,
            scanState: 'runError',
            error: error !== undefined ? System.serializeError(error) : undefined,
        });
    }

    protected async saveBrowserError(request: Crawlee.Request, error: BrowserError, session: Crawlee.Session): Promise<void> {
        (session.userData as SessionData[]).push({
            requestId: request.id,
            browserError: error,
        });
        await this.dataBase.addScanResult(request.id as string, {
            id: request.id,
            url: request.url,
            scanState: 'browserError',
            error: error !== undefined ? System.serializeError(error) : undefined,
        });
    }

    protected async saveScanResult(request: Crawlee.Request, issueCount: number, selector?: string): Promise<void> {
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

    protected async logBrowserFailure(request: Crawlee.Request, browserError: BrowserError): Promise<void> {
        await this.blobStore.setValue(`${request.id}.browser.err`, `${browserError.stack}`, { contentType: 'text/plain' });
    }

    protected async logPageError(request: Crawlee.Request, error: Error): Promise<void> {
        await this.blobStore.setValue(`${request.id}.err`, `${error.stack}`, { contentType: 'text/plain' });
    }
}
