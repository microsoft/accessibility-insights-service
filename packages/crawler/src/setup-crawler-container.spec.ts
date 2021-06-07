// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { DataBase } from './level-storage/data-base';
import { setupCloudCrawlerContainer, setupLocalCrawlerContainer } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { crawlerIocTypes } from './types/ioc-types';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(setupLocalCrawlerContainer, () => {
    it('resolves dependencies', () => {
        const crawlerRunOptions = {
            baseUrl: 'baseUrl',
            restartCrawl: false,
            inputFile: undefined,
            existingUrls: undefined,
            simulate: false,
        } as CrawlerRunOptions;

        const container = new inversify.Container({ autoBindInjectable: true });
        setupLocalCrawlerContainer(container);
        container.bind(crawlerIocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);

        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(DataBase)).toBeDefined();
        expect(container.get(crawlerIocTypes.ReporterFactory)).toBeDefined();
        expect(container.get(crawlerIocTypes.ApifyRequestQueueProvider)).toBeDefined();
        expect(container.get(crawlerIocTypes.PageProcessorFactory)).toBeDefined();
        expect(container.get(crawlerIocTypes.CrawlerEngine)).toBeDefined();
    });
});

describe(setupCloudCrawlerContainer, () => {
    it('resolves dependencies', () => {
        const crawlerRunOptions = {
            baseUrl: 'baseUrl',
            restartCrawl: false,
            inputFile: undefined,
            existingUrls: undefined,
            simulate: false,
        } as CrawlerRunOptions;

        const container = new inversify.Container({ autoBindInjectable: true });
        registerLoggerToContainer(container);
        setupCloudCrawlerContainer(container);
        container.bind(crawlerIocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);

        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(crawlerIocTypes.ApifyRequestQueueProvider)).toBeDefined();
        expect(container.get(crawlerIocTypes.RequestProcessor)).toBeDefined();
        expect(container.get(crawlerIocTypes.CrawlerEngine)).toBeDefined();
    });
});
