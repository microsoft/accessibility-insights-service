// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BrowserError } from 'scanner-global-library';
import { AxeResults } from 'axe-core';

export declare type ItemType = 'scanResult' | 'scanMetadata';
export declare type ScanState = 'pass' | 'fail' | 'runError' | 'browserError';

export interface DataBaseKey {
    type: ItemType;
    key: string;
}

export interface DataBaseItem<T> {
    key: DataBaseKey;
    value: T;
}

export interface ScanMetadata {
    baseUrl: string;
    basePageTitle?: string;
    userAgent?: string;
    browserResolution?: string;
}

export interface ScanResult {
    id: string;
    url: string;
    scanState: ScanState;
    issueCount?: number;
    axeResults?: AxeResults;
    error?: string | BrowserError;
}

export interface ScanResults {
    scanResults: ScanResult[];
    scanMetadata: ScanMetadata;
}
