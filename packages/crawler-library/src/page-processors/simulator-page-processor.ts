// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Apify from 'apify';
import { ActiveElementFinder } from '../discovery/active-element-finder';
// import { PageData } from '../page-data';
// import { PageScanner } from '../page-scanner';
import { PageProcessorBase, PageProcessorOptions } from './page-processor-base';
import { PageProcessorFactoryBase } from './page-processor-factory';

// const {
//     utils: { enqueueLinks },
// } = Apify;

export class SimulatorPageProcessor extends PageProcessorBase {
    public constructor(
        protected readonly requestQueue: Apify.RequestQueue,
        protected readonly discoveryPatterns: string[],
        private readonly selectors: string[],
        private readonly activeElementFinder: ActiveElementFinder = new ActiveElementFinder(),
    ) {
        super(requestQueue, discoveryPatterns);
    }

    public pageProcessor: Apify.PuppeteerHandlePage = async ({ page, request }) => {
        await this.openDatasetStore();
        await this.openKeyValueStore();

        const elements = await this.activeElementFinder.getActiveElements(page, this.selectors);

        console.log(elements);

        // const enqueued = await enqueueLinks({
        //     page,
        //     requestQueue: this.requestQueue,
        //     pseudoUrls: this.discoveryPatterns,
        // });
        // console.log(`Discovered ${enqueued.length} links on ${request.url} page.`);

        // const scanner = new PageScanner(page);
        // const scanResult = await scanner.scan();
        // if (scanResult.axeResults.violations.length > 0) {
        //     console.log(`Found ${scanResult.axeResults.violations.length} accessibility issues on ${request.url} page.`);
        // }

        // const pageData: PageData = {
        //     title: await page.title(),
        //     url: request.url,
        //     succeeded: true,
        //     axeResults: scanResult.axeResults,
        // };
        // await this.datasetStore.pushData(pageData);
        // await this.keyValueStore.setValue(`id-${Date.now().toString()}`, scanResult.report.asHTML(), { contentType: 'text/html' });
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
