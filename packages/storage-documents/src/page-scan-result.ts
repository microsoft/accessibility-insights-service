// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunResult } from './run-result';
import { ScanLevel } from './states';
import { StorageDocument } from './storage-document';

export interface PageIssueScanResult {
    runTime: string;
    level: ScanLevel;
    issues: string[];
}

export interface PageCrawlResult {
    runTime: string;
    links: string[];
}

export interface PageIssueScanRunResult {
    result?: PageIssueScanResult;
    run: RunResult;
}

export interface PageCrawlRunResult {
    result?: PageCrawlResult;
    run: RunResult;
}

/**
 * Describes the website page single scan result.
 * Intended to be used as a website page scan snapshot for a single scan run.
 *
 * The new db document will be created on each website page scan.
 * The db document id is composed of a website base URL, a page URL, and scan timestamp in Unix format.
 */
export interface PageScanResult extends StorageDocument {
    websiteId: string;
    url: string;
    crawl: PageCrawlRunResult;
    scan: PageIssueScanRunResult;
}
