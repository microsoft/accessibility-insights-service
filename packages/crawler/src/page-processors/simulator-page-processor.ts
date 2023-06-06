// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Crawlee from '@crawlee/puppeteer';
import { inject, injectable } from 'inversify';
import { PageNavigationHooks } from 'scanner-global-library';
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
import { PageProcessorBase } from './page-processor-base';

/* eslint-disable no-invalid-this */

@injectable()
export class SimulatorPageProcessor extends PageProcessorBase {
    private readonly selectors: string[];

    public processPage: Crawlee.PuppeteerRequestHandler = async (context) => {
        const operation = context.request.userData as Operation;
        if (operation.operationType === undefined || operation.operationType === 'no-op') {
            console.log(`Processing page ${context.page.url()}`);
            await this.enqueueLinks(context);
            await this.enqueueActiveElementsOp.enqueue(context, this.selectors);
            const axeResults = await this.accessibilityScanOp.run(
                context.page,
                context.request.id as string,
                this.crawlerConfiguration.axeSourcePath(),
            );
            const issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
            await this.saveSnapshot(context.page, context.request.id as string);
            await this.pushScanData({
                succeeded: true,
                id: context.request.id as string,
                url: context.request.url,
                issueCount: issueCount,
            });
            await this.saveScanResult(context.request, issueCount);
        } else if (operation.operationType === 'click') {
            const activeElement = operation.data as ActiveElement;
            console.log(`Processing page ${context.page.url()} with simulation click on element with selector '${activeElement.selector}'`);
            const operationResult = await this.clickElementOp.click(context, activeElement.selector, this.discoveryPatterns);
            let issueCount;
            if (operationResult.clickAction === 'page-action') {
                await this.enqueueLinks(context);
                const axeResults = await this.accessibilityScanOp.run(
                    context.page,
                    context.request.id as string,
                    this.crawlerConfiguration.axeSourcePath(),
                );
                issueCount = axeResults?.violations?.length > 0 ? axeResults.violations.reduce((a, b) => a + b.nodes.length, 0) : 0;
                await this.saveSnapshot(context.page, context.request.id as string);
                await this.saveScanResult(context.request, issueCount, activeElement.selector);
            }
            await this.pushScanData({
                id: context.request.id as string,
                url: context.request.url,
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

    public constructor(
        @inject(AccessibilityScanOperation) protected readonly accessibilityScanOp: AccessibilityScanOperation,
        @inject(LocalDataStore) protected readonly dataStore: DataStore,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(DataBase) protected readonly dataBase: DataBase,
        @inject(EnqueueActiveElementsOperation) protected readonly enqueueActiveElementsOp: EnqueueActiveElementsOperation,
        @inject(ClickElementOperation) protected readonly clickElementOp: ClickElementOperation,
        @inject(PageNavigationHooks) protected readonly pageNavigationHooks: PageNavigationHooks,
        @inject(CrawlerConfiguration) protected readonly crawlerConfiguration: CrawlerConfiguration,
        protected readonly saveSnapshotExt: typeof Crawlee.puppeteerUtils.saveSnapshot = Crawlee.puppeteerUtils.saveSnapshot,
    ) {
        super(accessibilityScanOp, dataStore, blobStore, dataBase, pageNavigationHooks, crawlerConfiguration, saveSnapshotExt);
        this.selectors = this.crawlerConfiguration.selectors();
    }
}
