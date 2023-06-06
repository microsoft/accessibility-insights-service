// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Crawlee from '@crawlee/puppeteer';
import { PageProcessorBase } from '../page-processors/page-processor-base';

export const crawlerIocTypes = {
    ReporterFactory: 'ReporterFactory',
    PageProcessorFactory: 'Factory<PageProcessor>',
    ApifyRequestQueueProvider: 'Provider<ApifyRequestQueue>',
    LevelUp: 'levelup.LevelUp',
    CrawlerEngine: 'CrawlerEngine',
    RequestProcessor: 'RequestProcessor',
    CrawlerProvider: 'CrawlerProvider',
};

export type PageProcessorFactory = () => PageProcessorBase;
export type ApifyRequestQueueProvider = () => Promise<Crawlee.RequestQueue>;
