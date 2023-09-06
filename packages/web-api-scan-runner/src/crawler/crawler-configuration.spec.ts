// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CrawlerConfiguration } from './crawler-configuration';

let crawlerConfiguration: CrawlerConfiguration;

describe(CrawlerConfiguration, () => {
    beforeEach(() => {
        crawlerConfiguration = new CrawlerConfiguration();
    });

    it('set crawler settings', () => {
        const workingDirectory = 'workingDirectory';
        crawlerConfiguration.setApifySettings(workingDirectory);
        expect(process.env.CRAWLEE_HEADLESS).toEqual('1');
        expect(process.env.CRAWLEE_STORAGE_DIR).toEqual(workingDirectory);
    });
});
