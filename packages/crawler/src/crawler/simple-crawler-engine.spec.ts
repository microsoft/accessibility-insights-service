// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerRunOptions } from '../types/crawler-run-options';
import { SimpleCrawlerEngine } from './simple-crawler-engine';

describe(SimpleCrawlerEngine, () => {
    let testSubject: SimpleCrawlerEngine;
    let crawlerRunOptions: CrawlerRunOptions;

    beforeAll(() => {
        testSubject = new SimpleCrawlerEngine();
        crawlerRunOptions = {
            localOutputDir: 'localOutputDir',
            memoryMBytes: 100,
            silentMode: true,
            debug: false,
        } as CrawlerRunOptions;
    });

    it('returns list of urls', async () => {
        const expectedUrls: string[] = [];

        const discoveredUrls = await testSubject.start(crawlerRunOptions);

        expect(discoveredUrls).toEqual(expectedUrls);
    });
});
