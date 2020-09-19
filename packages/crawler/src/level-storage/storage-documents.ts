// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { SummaryScanResults } from 'accessibility-insights-report';

export type ItemType = 'failedScanResult' | 'passedScanResult' | 'browserError' | 'runError' | 'scanMetadata';

export interface DataBaseKey {
    // tslint:disable-next-line:no-reserved-keywords
    type: ItemType;
    key: string;
}

export interface PageError {
    // tslint:disable-next-line:no-reserved-keywords
    url: string;
    error: string;
}

export interface ScanResults {
    summaryScanResults: SummaryScanResults;
    errors: PageError[];
    scanMetadata: ScanMetadata;
}

export interface ScanMetadata {
    baseUrl: string;
    basePageTitle?: string;
    userAgent?: string;
}
