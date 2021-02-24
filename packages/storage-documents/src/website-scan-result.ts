// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat, OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

export declare type ScanGroupType = 'consolidated-scan-report' | 'deep-scan';

export interface WebsiteScanResult extends StorageDocument {
    itemType: ItemType.websiteScanResult;
    scanGroupId: string;
    baseUrl: string;
    scanGroupType: ScanGroupType;
    pageScans?: PageScan[];
    reports?: WebsiteScanReport[];
    combinedResultsBlobId?: string;
    knownPages?: string[];
    discoveryPatterns?: string[];
    deepScanId?: string;
}

export interface WebsiteScanReport {
    reportId: string;
    format: ReportFormat;
    href: string;
}

export interface PageScan {
    scanId: string;
    url: string;
    scanState?: ScanState;
    runState?: OnDemandPageScanRunState;
    timestamp: string;
}
