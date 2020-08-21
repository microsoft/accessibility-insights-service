// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { PageScanner } from '../scanner-operations/page-scanner';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { PageProcessorOptions } from '../types/run-options';
import { ActiveElementsFinder } from '../utility/active-elements-finder';
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessor } from './page-processor-base';
import { SimulatorPageProcessor } from './simulator-page-processor';

@injectable()
export class PageProcessorFactory {
    constructor(@inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration) {}

    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        if (!pageProcessorOptions.crawlerRunOptions.simulate) {
            return new ClassicPageProcessor(
                new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory())),
                new LocalDataStore(),
                new LocalBlobStore(),
                pageProcessorOptions.requestQueue,
                this.crawlerConfiguration.getDiscoveryPattern(
                    pageProcessorOptions.crawlerRunOptions.baseUrl,
                    pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
                ),
            );
        }

        return new SimulatorPageProcessor(
            new EnqueueActiveElementsOperation(new ActiveElementsFinder()),
            new ClickElementOperation(),
            new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory())),
            new LocalDataStore(),
            new LocalBlobStore(),
            pageProcessorOptions.requestQueue,
            this.crawlerConfiguration.getDiscoveryPattern(
                pageProcessorOptions.crawlerRunOptions.baseUrl,
                pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
            ),
            this.crawlerConfiguration.getDefaultSelectors(pageProcessorOptions.crawlerRunOptions.selectors),
        );
    }
}
