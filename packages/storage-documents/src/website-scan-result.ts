// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { keys } from 'ts-transformer-keys';
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat, OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

export declare type ScanGroupType = 'consolidated-scan-report' | 'deep-scan';

/**
 * Represents website scan result composite document.
 *
 * The `WebsiteScanResult` document is stored in multiple DB documents. The common data is stored in a single instance
 * of the common `WebsiteScanResultBase` DB document with the composite key (`baseUrl`, `scanGroupId`).
 * The frequent delta updates are stored in multiple `WebsiteScanResultPart` DB documents with the composite key (`baseId`, `scanId`).
 * Each `WebsiteScanResultPart` DB document corresponds to the scan that created the update.
 *
 * The application layer should work with `WebsiteScanResult` document using the `WebsiteScanResultProvider` data provider
 * for the corresponding DB operations.
 */
export interface WebsiteScanResult extends WebsiteScanResultBase, WebsiteScanResultPartModel {}

/**
 * Represents the main static part of the WebsiteScanResult document.
 * Composite DB document key properties: `baseUrl`, `scanGroupId`
 */
export interface WebsiteScanResultBase extends StorageDocument {
    itemType: ItemType.websiteScanResult;
    baseUrl: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
    deepScanId?: string;
    discoveryPatterns?: string[];
    combinedResultsBlobId?: string;
    reports?: WebsiteScanReport[];
    created: string;
}

/**
 * Represents the partial dynamic part of the WebsiteScanResult document.
 * Composite DB document key properties: `baseId`, `scanId`
 */
export interface WebsiteScanResultPart extends StorageDocument, WebsiteScanResultPartModel {
    itemType: ItemType.websiteScanResultPart;
    baseId: string;
    scanId: string;
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

export interface WebsiteScanResultPartModel {
    pageScans?: PageScan[];
    knownPages?: string[];
}

export const websiteScanResultBaseKeys = keys<WebsiteScanResultBase>();
export const websiteScanResultPartModelKeys = keys<WebsiteScanResultPartModel>();
