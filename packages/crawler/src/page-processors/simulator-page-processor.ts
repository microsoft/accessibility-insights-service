// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore } from '../storage/store-types';
import { ActiveElement } from '../utility/active-elements-finder';
import { PageProcessorBase } from './page-processor-base';

@injectable()
// tslint:disable: no-unsafe-any
export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        protected readonly requestQueue: Apify.RequestQueue,
        @inject(EnqueueActiveElementsOperation) protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation,
        @inject(ClickElementOperation) protected readonly clickElementOp: ClickElementOperation,
        protected readonly selectors: string[],
        protected readonly snapshot: boolean,
        protected readonly discoveryPatterns?: string[],
        protected readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly gotoExtended: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
        protected readonly saveSnapshotExt: typeof Apify.utils.puppeteer.saveSnapshot = Apify.utils.puppeteer.saveSnapshot,
    ) {
        super(
            accessibilityScanOp,
            dataStore,
            blobStore,
            requestQueue,
            snapshot,
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
            await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            await this.saveSnapshot(page, request.id as string);
            await this.pushScanData({ succeeded: true, id: request.id as string, url: request.url });
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp.click(
                page,
                activeElement.selector,
                this.requestQueue,
                this.discoveryPatterns,
            );
            if (operationResult.clickAction === 'page-action') {
                await this.enqueueLinks(page);
                await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
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
            });
        }
    };
}
