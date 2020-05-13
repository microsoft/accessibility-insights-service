// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { ActiveElement } from '../discovery/active-element-finder';
import { EnqueueButtonsOperation, enqueueButtonsOperation } from '../page-operations/enqueue-buttons-operation';
import { Operation } from '../page-operations/operation';
import { PageProcessorBase, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns: string[],
        private readonly selectors: string[],
        private readonly enqueueButtonsOp: EnqueueButtonsOperation = enqueueButtonsOperation,
    ) {
        super(requestQueue, discoveryPatterns);
    }

    public pageProcessor: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        const operation = request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            // await this.enqueueLinks(page);
            await this.enqueueButtonsOp(page, this.selectors, this.requestQueue);
            await this.accessibilityScanOp(page, request.id as string, this.blobStore);
            await this.pushScanData(request.id as string, request.url);
        } else if ((request.userData as Operation).operationType === 'click') {
            const element = operation.data as ActiveElement;

            await this.pushScanData(request.id as string, request.url, element.html);
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
