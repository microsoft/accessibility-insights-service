// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CrawlerScanResult } from './hc-crawler-types';

export interface CrawlerScanResults {
    results?: CrawlerScanResult[];
    error?: string;
}
