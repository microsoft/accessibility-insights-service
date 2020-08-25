// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import { Url } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxePuppeteerFactory } from '../axe-puppeteer/axe-puppeteer-factory';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
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
    constructor(
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly urlObj: typeof Url = Url,
    ) {}

    public createPageProcessor(pageProcessorOptions: PageProcessorOptions): PageProcessor {
        if (!pageProcessorOptions.crawlerRunOptions.simulate) {
            return new ClassicPageProcessor(
                new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory()), this.logger),
                new LocalDataStore(),
                new LocalBlobStore(),
                this.logger,
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
            new AccessibilityScanOperation(new PageScanner(reporterFactory(), new AxePuppeteerFactory()), this.logger),
            new LocalDataStore(),
            new LocalBlobStore(),
            this.logger,
            pageProcessorOptions.requestQueue,
            new EnqueueActiveElementsOperation(new ActiveElementsFinder()),
            new ClickElementOperation(),
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
