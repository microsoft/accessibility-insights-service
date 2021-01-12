// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { PageProcessorBase } from '../page-processors/page-processor-base';

export const iocTypes = {
    ReporterFactory: 'ReporterFactory',
    CrawlerRunOptions: 'CrawlerRunOptions',
    PageProcessorFactory: 'Factory<PageProcessor>',
    ApifyRequestQueueProvider: 'Provider<ApifyRequestQueue>',
    ApifyKeyValueStore: 'ApifyKeyValueStore',
    ApifyDataset: 'ApifyDataset',
    LevelUp: 'levelup.LevelUp',
    CrawlerEngine: 'CrawlerEngine',
};

export type PageProcessorFactory = () => PageProcessorBase;
export type ApifyRequestQueueProvider = () => Promise<Apify.RequestQueue>;
