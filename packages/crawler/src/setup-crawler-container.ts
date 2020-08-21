// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { ApifyResourceCreator } from './apify-resources/resource-creator';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerFactory } from './crawler/crawler-factory';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { AccessibilityScanOperation } from './page-operations/accessibility-scan-operation';
import { ClickElementOperation } from './page-operations/click-element-operation';
import { EnqueueActiveElementsOperation } from './page-operations/enqueue-active-elements-operation';
import { ClassicPageProcessor } from './page-processors/classic-page-processor';
import { PageProcessorBase } from './page-processors/page-processor-base';
import { PageProcessorFactory } from './page-processors/page-processor-factory';
import { SimulatorPageProcessor } from './page-processors/simulator-page-processor';
import { PageScanner } from './scanner-operations/page-scanner';
import { LocalBlobStore } from './storage/local-blob-store';
import { LocalDataStore } from './storage/local-data-store';
import { ActiveElementsFinder } from './utility/active-elements-finder';

export function setupCrawlerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind(CrawlerEngine).toSelf().inSingletonScope();
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind(CrawlerFactory).toSelf().inSingletonScope();
    container.bind(ApifyResourceCreator).toSelf().inSingletonScope();
    container.bind(AccessibilityScanOperation).toSelf().inSingletonScope();
    container.bind(ClickElementOperation).toSelf().inSingletonScope();
    container.bind(EnqueueActiveElementsOperation).toSelf().inSingletonScope();
    container.bind(ClassicPageProcessor).toSelf().inSingletonScope();
    container.bind(PageProcessorFactory).toSelf().inSingletonScope();
    container.bind(SimulatorPageProcessor).toSelf().inSingletonScope();
    container.bind(PageProcessorBase).toSelf().inSingletonScope();
    container.bind(PageScanner).toSelf().inSingletonScope();
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container.bind<AxePuppeteerFactory>(AxePuppeteerFactory).toSelf().inSingletonScope();

    container.bind(LocalBlobStore).toSelf().inSingletonScope();
    container.bind(LocalDataStore).toSelf().inSingletonScope();
    container.bind(ActiveElementsFinder).toSelf().inSingletonScope();

    return container;
}
