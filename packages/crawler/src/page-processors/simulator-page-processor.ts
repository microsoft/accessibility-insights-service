// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { ClickElementOperation, clickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation, enqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { ActiveElement } from '../utility/active-elements-finder';
import { PageProcessorBase } from './page-processor-base';

// tslint:disable: no-unsafe-any
export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns: string[],
        private readonly selectors: string[],
        private readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation = enqueueActiveElementsOperation,
        private readonly clickElementOp: ClickElementOperation = clickElementOperation,
    ) {
        super(requestQueue, discoveryPatterns);
    }

    public pageProcessor: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            console.log(`Crawling page ${page.url()}`);
            await this.enqueueLinks(page);
            await this.enqueueActiveElementsOp(page, this.selectors, this.requestQueue);
            await this.accessibilityScanOp.run(page, request.id as string, this.blobStore);
            await this.pushScanData({ id: request.id as string, url: request.url });
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp(page, activeElement.selector, this.requestQueue, this.discoveryPatterns);
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
