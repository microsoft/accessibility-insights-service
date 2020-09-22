// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { ApifyResourceCreator } from './apify/apify-resource-creator';
import { DataBase } from './level-storage/data-base';
import { ClassicPageProcessor } from './page-processors/classic-page-processor';
import { PageProcessor } from './page-processors/page-processor-base';
import { SimulatorPageProcessor } from './page-processors/simulator-page-processor';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

export function setupCrawlerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });

    container.bind(DataBase).toSelf().inSingletonScope();
    container.bind(iocTypes.ReporterFactory).toConstantValue(reporterFactory);

    setupSingletonProvider(iocTypes.ApifyRequestQueueProvider, container, async (context: inversify.interfaces.Context) => {
        const apifyResourceCreator = context.container.get(ApifyResourceCreator);
        const crawlerRunOptions = context.container.get<CrawlerRunOptions>(iocTypes.CrawlerRunOptions);

        return apifyResourceCreator.createRequestQueue(
            crawlerRunOptions.baseUrl,
            crawlerRunOptions.restartCrawl,
            crawlerRunOptions.inputFile,
            crawlerRunOptions.existingUrls,
        );
    });

    container
        .bind<inversify.interfaces.Factory<PageProcessor>>(iocTypes.PageProcessorFactory)
        .toFactory<PageProcessor>((context: inversify.interfaces.Context) => {
            const crawlerRunOptions = context.container.get<CrawlerRunOptions>(iocTypes.CrawlerRunOptions);

            return () => {
                if (crawlerRunOptions.simulate) {
                    return context.container.get(SimulatorPageProcessor);
                } else {
                    return context.container.get(ClassicPageProcessor);
                }
            };
        });

    return container;
}

export function registerCrawlerRunOptions(container: inversify.Container, crawlerRunOptions: CrawlerRunOptions): void {
    container.bind(iocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);
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
