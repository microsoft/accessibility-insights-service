// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

// import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { DataBase } from './level-storage/data-base';
import { setupCrawlerContainer } from './setup-crawler-container';
import { iocTypes } from './types/ioc-types';
// import * as inversify from 'inversify';

describe(setupCrawlerContainer, () => {
    it('resolves dependencies', () => {
        // const container = new inversify.Container({ autoBindInjectable: true });
        const container = setupCrawlerContainer();

        expect(container.get(DataBase)).toBeDefined();
        // expect(container.get(CrawlerConfiguration)).toBeDefined();
        expect(container.get(iocTypes.ReporterFactory)).toBeDefined();
    });
});
