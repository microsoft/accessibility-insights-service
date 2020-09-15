// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { ApifyResourceCreator } from './apify/apify-resource-creator';
// import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { dataBase, DataBase } from './level-storage/data-base';
import { ClassicPageProcessor } from './page-processors/classic-page-processor';
import { PageProcessor } from './page-processors/page-processor-base';
import { SimulatorPageProcessor } from './page-processors/simulator-page-processor';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

export function setupCrawlerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind(DataBase).toConstantValue(dataBase);
    // container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind(iocTypes.ReporterFactory).toConstantValue(reporterFactory);

    container.bind(iocTypes.ApifyRequestQueue).toDynamicValue(async (context: inversify.interfaces.Context) => {
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
