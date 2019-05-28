// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunState, ScanLevel } from './states';
import { StorageDocument } from './storage-document';

export interface ScanResult {
    runTime: string;
    level: ScanLevel;
    issues: string[];
}

export interface CrawlResult {
    runTime: string;
    links: string[];
}

export interface RunResult {
    runTime: string;
    state: RunState;
    error?: string;
}

export interface Result<T> {
    result?: T;
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
    crawl: Result<CrawlResult>;
    scan: Result<ScanResult>;
}
