// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { DataBase } from './level-storage/data-base';
import { setupCloudCrawlerContainer, setupLocalCrawlerContainer } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

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
        container.bind(iocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);

        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(DataBase)).toBeDefined();
        expect(container.get(iocTypes.ReporterFactory)).toBeDefined();
        expect(container.get(iocTypes.ApifyRequestQueueProvider)).toBeDefined();
        expect(container.get(iocTypes.PageProcessorFactory)).toBeDefined();
        expect(container.get(iocTypes.CrawlerEngine)).toBeDefined();
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
        container.bind(iocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);

        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(iocTypes.ApifyRequestQueueProvider)).toBeDefined();
        expect(container.get(iocTypes.RequestProcessor)).toBeDefined();
        expect(container.get(iocTypes.CrawlerEngine)).toBeDefined();
    });
});
