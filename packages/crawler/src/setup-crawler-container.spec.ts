// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { DataBase } from './level-storage/data-base';
import { setupCrawlerContainer } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

// tslint:disable: no-object-literal-type-assertion

describe(setupCrawlerContainer, () => {
    it('resolves dependencies', () => {
        const crawlerRunOptions = {
            baseUrl: 'baseUrl',
            restartCrawl: false,
            inputFile: undefined,
            existingUrls: undefined,
            simulate: false,
        } as CrawlerRunOptions;

        const container = setupCrawlerContainer();
        container.bind(iocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);

        expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(DataBase)).toBeDefined();
        expect(container.get(iocTypes.ReporterFactory)).toBeDefined();
        expect(container.get(iocTypes.ApifyRequestQueue)).toBeDefined();
        expect(container.get(iocTypes.PageProcessorFactory)).toBeDefined();
    });
});
