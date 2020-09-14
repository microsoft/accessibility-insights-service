// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import { Url } from 'common';
import { inject, injectable } from 'inversify';
import { PageConfigurator, PageResponseProcessor } from 'scanner-global-library';
import { AxePuppeteerFactory } from '../axe-puppeteer/axe-puppeteer-factory';
import { ActiveElementsFinder } from '../browser-components/active-elements-finder';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { dataBase } from '../level-storage/data-base';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { PageScanner } from '../scanners/page-scanner';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { PageProcessorOptions } from '../types/run-options';
import { ClassicPageProcessor } from './classic-page-processor';
import { PageProcessor } from './page-processor-base';
import { SimulatorPageProcessor } from './simulator-page-processor';

@injectable()
export class PageProcessorFactory {
    constructor(
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        private readonly urlObj: typeof Url = Url,
    ) {}

    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        if (!pageProcessorOptions.crawlerRunOptions.simulate) {
            return new ClassicPageProcessor(
                new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory())),
                new LocalDataStore(),
                new LocalBlobStore(),
                dataBase,
                new PageResponseProcessor(),
                new PageConfigurator(),
                pageProcessorOptions.requestQueue,
                this.crawlerConfiguration.getSnapshot(
                    pageProcessorOptions.crawlerRunOptions.snapshot,
                    pageProcessorOptions.crawlerRunOptions.simulate,
                ),
                this.crawlerConfiguration.getDiscoveryPattern(
                    this.urlObj.getRootUrl(pageProcessorOptions.crawlerRunOptions.baseUrl),
                    pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
                ),
            );
        }

        return new SimulatorPageProcessor(
            new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory())),
            new LocalDataStore(),
            new LocalBlobStore(),
            dataBase,
            new EnqueueActiveElementsOperation(new ActiveElementsFinder()),
            new ClickElementOperation(),
            new PageResponseProcessor(),
            new PageConfigurator(),
            pageProcessorOptions.requestQueue,
            this.crawlerConfiguration.getDefaultSelectors(pageProcessorOptions.crawlerRunOptions.selectors),
            this.crawlerConfiguration.getSnapshot(
                pageProcessorOptions.crawlerRunOptions.snapshot,
                pageProcessorOptions.crawlerRunOptions.simulate,
            ),
            this.crawlerConfiguration.getDiscoveryPattern(
                this.urlObj.getRootUrl(pageProcessorOptions.crawlerRunOptions.baseUrl),
                pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
            ),
        );
    }
}
