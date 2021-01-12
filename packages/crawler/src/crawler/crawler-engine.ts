// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CrawlerRunOptions } from '../types/crawler-run-options';

export interface CrawlerEngine<T = void> {
    start(crawlerRunOptions: CrawlerRunOptions): Promise<T>;
}
