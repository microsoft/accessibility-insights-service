// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Apify from 'apify';
import { PageData } from '../page-data';

// tslint:disable: no-unsafe-any

const {
    utils: {
        puppeteer: { gotoExtended },
    },
} = Apify;

export interface PageProcessorOptions {
    baseUrl: string;
    requestQueue: Apify.RequestQueue;
    discoveryPatterns?: string[];
    simulate?: boolean;
    selectors?: string[];
}

export abstract class PageProcessorBase {
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

    protected keyValueStore: Apify.KeyValueStore;
    protected datasetStore: Apify.Dataset;

    public constructor(protected readonly requestQueue: Apify.RequestQueue, protected readonly discoveryPatterns?: string[]) {}

    /**
     * Overrides the function that opens the page in Puppeteer.
     * Return the result of Puppeteer's [page.goto()](https://pptr.dev/#?product=Puppeteer&show=api-pagegotourl-options) function.
     */
    public gotoFunction: Apify.PuppeteerGoto = async (inputs: Apify.PuppeteerGotoInputs) => {
        return gotoExtended(inputs.page, inputs.request, {
            waitUntil: 'networkidle0',
            timeout: this.gotoTimeoutSecs * 1000,
        });
    };

    /**
     * This function is called when the crawling of a request failed after several reties
     */
    public pageErrorProcessor: Apify.HandleFailedRequest = async ({ request, error }) => {
        const pageData: PageData = {
            title: '',
            url: request.url,
            succeeded: false,
            error: JSON.stringify(error),
            requestErrors: request.errorMessages,
        };
        await Apify.pushData(pageData);
    };

    protected async openDatasetStore(): Promise<void> {
        if (this.datasetStore === undefined) {
            this.datasetStore = await Apify.openDataset('scan-results');
        }
    }

    protected async openKeyValueStore(): Promise<void> {
        if (this.keyValueStore === undefined) {
            this.keyValueStore = await Apify.openKeyValueStore('scan-results');
        }
    }
}
