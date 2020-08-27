// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import { Url } from 'common';
import { inject, injectable } from 'inversify';
import { ActiveElementsFinder } from '../browser-components/active-elements-finder';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { AxePuppeteerFactory } from '../factories/axe-puppeteer-factory';
import { AccessibilityScanOperation } from '../page-operations/accessibility-scan-operation';
import { ClickElementOperation } from '../page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from '../page-operations/enqueue-active-elements-operation';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { Page } from '../scanner/page';
import { LocalBlobStore } from '../storage/local-blob-store';
import { LocalDataStore } from '../storage/local-data-store';
import { PageProcessorOptions } from '../types/run-options';
import { WebDriver } from '../web-driver/web-driver';
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
                new AccessibilityScanOperation(
                    new AIScanner(new Page(new AxePuppeteerFactory(), new WebDriver())),
                    new ReportGenerator(reporterFactory),
                ),
                new LocalDataStore(),
                new LocalBlobStore(),
                pageProcessorOptions.requestQueue,
                this.crawlerConfiguration.getSnapshot(
                    pageProcessorOptions.crawlerRunOptions.snapshot,
                    pageProcessorOptions.crawlerRunOptions.simulate,
                ),
                this.crawlerConfiguration.getDiscoveryPattern(
                    this.urlObj.getRootUrl(pageProcessorOptions.crawlerRunOptions.url),
                    pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
                ),
            );
        }

        return new SimulatorPageProcessor(
            new AccessibilityScanOperation(
                new AIScanner(new Page(new AxePuppeteerFactory(), new WebDriver())),
                new ReportGenerator(reporterFactory),
            ),
            new LocalDataStore(),
            new LocalBlobStore(),
            pageProcessorOptions.requestQueue,
            new EnqueueActiveElementsOperation(new ActiveElementsFinder()),
            new ClickElementOperation(),
            this.crawlerConfiguration.getDefaultSelectors(pageProcessorOptions.crawlerRunOptions.selectors),
            this.crawlerConfiguration.getSnapshot(
                pageProcessorOptions.crawlerRunOptions.snapshot,
                pageProcessorOptions.crawlerRunOptions.simulate,
            ),
            this.crawlerConfiguration.getDiscoveryPattern(
                this.urlObj.getRootUrl(pageProcessorOptions.crawlerRunOptions.url),
                pageProcessorOptions.crawlerRunOptions.discoveryPatterns,
            ),
        );
    }
}
