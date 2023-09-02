// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { axeScannerIocTypes, localAxeConfiguration, webAxeRunOptions } from 'axe-core-scanner';
import { ApifyRequestQueueCreator } from './apify/apify-request-queue-creator';
import { Crawler } from './crawler';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { SiteCrawlerEngine } from './crawler/site-crawler-engine';
import { PageCrawlerEngine } from './crawler/page-crawler-engine';
import { DataBase } from './level-storage/data-base';
import { ClassicPageProcessor } from './page-processors/classic-page-processor';
import { PageProcessor } from './page-processors/page-processor-base';
import { SimulatorPageProcessor } from './page-processors/simulator-page-processor';
import { crawlerIocTypes } from './types/ioc-types';

export function setupLocalCrawlerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    container.bind(DataBase).toSelf().inSingletonScope();
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind(crawlerIocTypes.ReporterFactory).toConstantValue(reporterFactory);
    container.bind(crawlerIocTypes.CrawlerEngine).to(SiteCrawlerEngine);
    container.bind(axeScannerIocTypes.AxeConfiguration).toConstantValue(localAxeConfiguration);
    container.bind(axeScannerIocTypes.AxeRunOptions).toConstantValue(webAxeRunOptions);

    setupSingletonProvider(crawlerIocTypes.ApifyRequestQueueFactory, container, async (context: inversify.interfaces.Context) => {
        const apifyResourceCreator = context.container.get(ApifyRequestQueueCreator);
        const crawlerConfiguration = context.container.get(CrawlerConfiguration);

        return apifyResourceCreator.createRequestQueue(crawlerConfiguration.baseUrl(), crawlerConfiguration.requestQueueOptions());
    });

    container
        .bind<inversify.interfaces.Factory<PageProcessor>>(crawlerIocTypes.PageProcessorFactory)
        .toFactory<PageProcessor>((context: inversify.interfaces.Context) => {
            const crawlerConfiguration = context.container.get(CrawlerConfiguration);

            return () => {
                if (crawlerConfiguration.simulate()) {
                    return context.container.get(SimulatorPageProcessor);
                } else {
                    return context.container.get(ClassicPageProcessor);
                }
            };
        });

    return container;
}

export function setupCloudCrawlerContainer(container: inversify.Container): inversify.Container {
    container.options.skipBaseClassChecks = true;
    container.bind(crawlerIocTypes.CrawlerEngine).to(PageCrawlerEngine);
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    setupSingletonProvider(crawlerIocTypes.ApifyRequestQueueFactory, container, async (context: inversify.interfaces.Context) => {
        const apifyResourceCreator = context.container.get(ApifyRequestQueueCreator);
        const crawlerConfiguration = context.container.get(CrawlerConfiguration);

        return apifyResourceCreator.createRequestQueue(crawlerConfiguration.baseUrl(), crawlerConfiguration.requestQueueOptions());
    });

    setupSingletonProvider(crawlerIocTypes.CrawlerFactory, container, async (context: inversify.interfaces.Context) => {
        return new Crawler(context.container);
    });

    return container;
}

function setupSingletonProvider<T>(
    key: string,
    container: inversify.interfaces.Container,
    factory: (context: inversify.interfaces.Context) => Promise<T>,
): void {
    let singletonInstancePromise: Promise<T>;
    container.bind(key).toProvider((context: inversify.interfaces.Context) => {
        return async () => {
            if (singletonInstancePromise === undefined) {
                singletonInstancePromise = factory(context);
            }

            return singletonInstancePromise;
        };
    });
}
