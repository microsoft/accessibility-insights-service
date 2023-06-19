// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Log } from '@crawlee/puppeteer';
import { PageNavigator } from 'scanner-global-library';

export const crawlerIocTypes = {
    ApifyRequestQueueFactory: 'ApifyRequestQueueFactory',
    CrawlerEngine: 'CrawlerEngine',
    CrawlerFactory: 'CrawlerFactory',
    LevelUp: 'LevelUp',
    PageProcessorFactory: 'PageProcessorFactory',
    PageNavigatorFactory: 'PageNavigatorFactory',
    ReporterFactory: 'ReporterFactory',
};

export type PageNavigatorFactory = (log?: Log) => Promise<PageNavigator>;
