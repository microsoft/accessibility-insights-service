// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
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
        @inject(EnqueueActiveElementsOperation) protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation,
        @inject(ClickElementOperation) protected readonly clickElementOp: ClickElementOperation,
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(GlobalLogger) private readonly loggerSimulator: GlobalLogger,
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns: string[],
        protected readonly selectors: string[],
        protected readonly enqueueLinksSimulator: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly gotoExtendedSimulator: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
    ) {
        super(
            accessibilityScanOp,
            dataStore,
            blobStore,
            loggerSimulator,
            requestQueue,
            discoveryPatterns,
            enqueueLinksSimulator,
            gotoExtendedSimulator,
        );
    }

    public processPage: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            this.loggerSimulator.logInfo(`Crawling page ${page.url()}`);
            await this.enqueueLinks(page);
            await this.enqueueActiveElementsOp.find(page, this.selectors, this.requestQueue);
            await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            await this.pushScanData({ id: request.id as string, url: request.url });
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            this.loggerSimulator.logInfo(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp.click(
                page,
                activeElement.selector,
                this.requestQueue,
                this.discoveryPatterns,
            );
            if (operationResult.clickAction === 'page-action') {
                // await this.saveSnapshot(page, request.id as string);
                await this.enqueueLinks(page);
                await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            }
            await this.pushScanData({
                id: request.id as string,
                url: request.url,
                activatedElement: {
                    ...activeElement,
                    clickAction: operationResult.clickAction,
                    navigationUrl: operationResult.navigationUrl,
                },
            });
        }
    };
}
