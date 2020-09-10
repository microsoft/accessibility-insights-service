// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { DataBase } from './level-storage/data-base';
import { setupCrawlerContainer } from './setup-crawler-container';

describe(setupCrawlerContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCrawlerContainer();

        expect(container.get(DataBase)).toBeDefined();
        expect(container.get(CrawlerConfiguration)).toBeDefined();
        // tslint:disable-next-line: no-backbone-get-set-outside-model
        expect(container.get('ReporterFactory')).toBeDefined();
    });
});
