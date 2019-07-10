// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RunState, ScanLevel, WebsiteScanState } from './states';
import { StorageDocument } from './storage-document';

/**
 * Describes the website page last scan result.
 */
export interface PageLastScanResult {
    id: string;
    pageId: string;
    url: string;
    lastUpdated: string;
    level?: ScanLevel;
    runState: RunState;
}

/**
 * Describes the website last scan state.
 */
export interface Website extends StorageDocument {
    websiteId: string;
    name: string;
    baseUrl: string;
    serviceTreeId: string;
    lastScanResult?: {
        lastUpdated: string;
        level?: ScanLevel;
        scanState: WebsiteScanState;
    };
    lastPageScanResults?: PageLastScanResult[];
    deepScanningEnabled: boolean;
}
