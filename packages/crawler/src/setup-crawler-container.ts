// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reporterFactory } from 'accessibility-insights-report';
import * as inversify from 'inversify';
import { ApifyResourceCreator } from './apify/apify-resource-creator';
import { Crawler } from './crawler';
import { PuppeteerCrawlerEngine } from './crawler/puppeteer-crawler-engine';
import { SimpleCrawlerEngine } from './crawler/simple-crawler-engine';
import { DataBase } from './level-storage/data-base';
import { ClassicPageProcessor } from './page-processors/classic-page-processor';
import { PageProcessor } from './page-processors/page-processor-base';
import { SimulatorPageProcessor } from './page-processors/simulator-page-processor';
import { UrlCollectionRequestProcessor } from './page-processors/url-collection-request-processor';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

export function setupLocalCrawlerContainer(container: inversify.Container): inversify.Container {
    container.bind(DataBase).toSelf().inSingletonScope();
    container.bind(iocTypes.ReporterFactory).toConstantValue(reporterFactory);
    container.bind(iocTypes.CrawlerEngine).to(PuppeteerCrawlerEngine);

    setupSingletonProvider(iocTypes.ApifyRequestQueueProvider, container, async (context: inversify.interfaces.Context) => {
        const apifyResourceCreator = context.container.get(ApifyResourceCreator);
        const crawlerRunOptions = context.container.get<CrawlerRunOptions>(iocTypes.CrawlerRunOptions);

        return apifyResourceCreator.createRequestQueue(
            crawlerRunOptions.baseUrl,
            crawlerRunOptions.restartCrawl,
            crawlerRunOptions.inputUrls,
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

export function setupCloudCrawlerContainer(container: inversify.Container): inversify.Container {
    container.bind(iocTypes.CrawlerEngine).to(SimpleCrawlerEngine);
    setupSingletonProvider(iocTypes.ApifyRequestQueueProvider, container, async (context: inversify.interfaces.Context) => {
        const apifyResourceCreator = context.container.get(ApifyResourceCreator);
        const crawlerRunOptions = context.container.get<CrawlerRunOptions>(iocTypes.CrawlerRunOptions);

        return apifyResourceCreator.createRequestQueue(
            crawlerRunOptions.baseUrl,
            crawlerRunOptions.restartCrawl,
            crawlerRunOptions.inputUrls,
        );
    });

    container.bind(iocTypes.RequestProcessor).to(UrlCollectionRequestProcessor);

    setupSingletonProvider(iocTypes.CrawlerProvider, container, async (context: inversify.interfaces.Context) => {
        return new Crawler(context.container);
    });

    return container;
}

export function registerCrawlerRunOptions(container: inversify.interfaces.Container, crawlerRunOptions: CrawlerRunOptions): void {
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
