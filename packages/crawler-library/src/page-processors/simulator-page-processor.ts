// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { ActiveElement } from '../discovery/active-elements-finder';
import { ClickElementOperation, clickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation, enqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { Operation } from '../page-operations/operation';
import { PageProcessorBase, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

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
            await this.accessibilityScanOp(page, request.id as string, this.blobStore);
            await this.pushScanData(request.id as string, request.url);
        } else if ((request.userData as Operation).operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Crawling page ${page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp(page, activeElement.selector, this.requestQueue, this.discoveryPatterns);
            if (operationResult.transition === 'action') {
                await this.saveSnapshot(page, activeElement.hash);
                await this.enqueueLinks(page);
                await this.accessibilityScanOp(page, request.id as string, this.blobStore);
            }
            await this.pushScanData(request.id as string, request.url, {
                activatedElement: activeElement,
                elementClickTransition: operationResult.transition,
                elementNavigationUrl: operationResult.navigationUrl,
            });
        }
    };
}

export class SimulatorPageProcessorFactory extends PageProcessorFactoryBase {
    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessorBase {
        return new SimulatorPageProcessor(
            pageProcessorOptions.requestQueue,
            this.getDiscoveryPattern(pageProcessorOptions.baseUrl, pageProcessorOptions.discoveryPatterns),
            this.getDefaultSelectors(pageProcessorOptions.selectors),
        );
    }

    private getDefaultSelectors(selectors: string[]): string[] {
        return selectors === undefined || selectors.length === 0 ? ['button'] : selectors;
    }
}
