// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Logger } from 'logger';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { BlobStore, DataStore, scanResultStorageName } from '../storage/store-types';
import { ActiveElement } from '../utility/active-elements-finder';
import { PageProcessorBase } from './page-processor-base';

// tslint:disable: no-unsafe-any
export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        protected readonly logger: Logger,
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns: string[],
        protected readonly selectors: string[],
        protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation = new EnqueueActiveElementsOperation(),
        protected readonly clickElementOp: ClickElementOperation = new ClickElementOperation(),
        protected readonly accessibilityScanOp: AccessibilityScanOperation = new AccessibilityScanOperation(logger),
        protected readonly dataStore: DataStore = new LocalDataStore(scanResultStorageName),
        protected readonly blobStore: BlobStore = new LocalBlobStore(scanResultStorageName),
        protected readonly enqueueLinksSimulator: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
        protected readonly gotoExtendedSimulator: typeof Apify.utils.puppeteer.gotoExtended = Apify.utils.puppeteer.gotoExtended,
    ) {
        super(
            logger,
            requestQueue,
            discoveryPatterns,
            accessibilityScanOp,
            dataStore,
            blobStore,
            enqueueLinksSimulator,
            gotoExtendedSimulator,
        );
    }

    public processPage: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            this.logger.logInfo(`Crawling page ${page.url()}`);
            await this.enqueueLinks(page);
            await this.enqueueActiveElementsOp.find(page, this.selectors, this.requestQueue);
            await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            await this.pushScanData({ id: request.id as string, url: request.url });
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            this.logger.logInfo(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
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
