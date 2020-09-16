// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { PageConfigurator, PageResponseProcessor } from 'scanner-global-library';
import { ActiveElement } from '../browser-components/active-elements-finder';
import { DataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore } from '../storage/store-types';
import { PageProcessorBase } from './page-processor-base';

@injectable()
// tslint:disable: no-unsafe-any
export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(EnqueueActiveElementsOperation) protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation,
        @inject(ClickElementOperation) protected readonly clickElementOp: ClickElementOperation,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageConfigurator) protected readonly pageConfigurator: PageConfigurator,
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly selectors: string[],
        protected readonly snapshot: boolean,
        protected readonly baseUrl: string,
        protected readonly discoveryPatterns?: string[],
        protected readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly gotoExtended: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
        protected readonly saveSnapshotExt: typeof Apify.utils.puppeteer.saveSnapshot = Apify.utils.puppeteer.saveSnapshot,
    ) {
        super(
            accessibilityScanOp,
            dataStore,
            blobStore,
            dataBase,
            pageResponseProcessor,
            pageConfigurator,
            requestQueue,
            snapshot,
            baseUrl,
            discoveryPatterns,
            enqueueLinksExt,
            gotoExtended,
            saveSnapshotExt,
        );
    }

    public processPage: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            console.log(`Crawling page ${page.url()}`);
            await this.enqueueLinks(page);
            await this.enqueueActiveElementsOp.find(page, this.selectors, this.requestQueue);
            const issueCount = await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            await this.saveSnapshot(page, request.id as string);
            await this.pushScanData({ succeeded: true, id: request.id as string, url: request.url, issueCount: issueCount });
            await this.saveScanResultToDataBase(request, issueCount);
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp.click(
                page,
                activeElement.selector,
                this.requestQueue,
                this.discoveryPatterns,
            );
            let issueCount;
            if (operationResult.clickAction === 'page-action') {
                await this.enqueueLinks(page);
                issueCount = await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
                await this.saveSnapshot(page, request.id as string);
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
            await this.saveScanResultToDataBase(request, issueCount);
        }
    };
}
