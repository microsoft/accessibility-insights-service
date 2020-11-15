// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { PageNavigator } from 'scanner-global-library';
import { ActiveElement } from '../browser-components/active-elements-finder';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore } from '../storage/store-types';
import { ApifyRequestQueueProvider, iocTypes } from '../types/ioc-types';
import { PageProcessorBase } from './page-processor-base';

/* eslint-disable no-invalid-this */

@injectable()
export class SimulatorPageProcessor extends PageProcessorBase {
    private readonly selectors: string[];

    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(EnqueueActiveElementsOperation) protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation,
        @inject(ClickElementOperation) protected readonly clickElementOp: ClickElementOperation,
        @inject(PageNavigator) protected readonly pageNavigator: PageNavigator,
        @inject(iocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerConfiguration) protected readonly crawlerConfiguration: CrawlerConfiguration,
        protected readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly saveSnapshotExt: typeof Apify.utils.puppeteer.saveSnapshot = Apify.utils.puppeteer.saveSnapshot,
    ) {
        super(
            accessibilityScanOp,
            dataStore,
            blobStore,
            dataBase,
            pageNavigator,
            requestQueueProvider,
            crawlerConfiguration,
            enqueueLinksExt,
            saveSnapshotExt,
        );
        this.selectors = this.crawlerConfiguration.selectors();
    }

    public processPage: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        const requestQueue = await this.requestQueueProvider();
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            console.log(`Processing page ${page.url()}`);
            await this.enqueueLinks(page);
            await this.enqueueActiveElementsOp.find(page, this.selectors, requestQueue);
            const axeResults = await this.accessibilityScanOp.run(page, request.id as string);
            const issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
            await this.saveSnapshot(page, request.id as string);
            await this.pushScanData({ succeeded: true, id: request.id as string, url: request.url, issueCount: issueCount });
            await this.saveScanResult(request, issueCount);
        } else if (operation.operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Processing page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp.click(page, activeElement.selector, requestQueue, this.discoveryPatterns);
            let issueCount;
            if (operationResult.clickAction === 'page-action') {
                await this.enqueueLinks(page);
                const axeResults = await this.accessibilityScanOp.run(page, request.id as string);
                issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
                await this.saveSnapshot(page, request.id as string);
                await this.saveScanResult(request, issueCount, activeElement.selector);
            }
            await this.pushScanData({
                id: request.id as string,
                url: request.url,
                succeeded: true,
                activatedElement: {
                    ...activeElement,
                    clickAction: operationResult.clickAction,
                    navigationUrl: operationResult.navigationUrl,
                },
                issueCount: issueCount,
            });
        }
    };
}
