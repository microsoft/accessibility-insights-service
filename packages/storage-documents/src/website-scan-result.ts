// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { keys } from 'ts-transformer-keys';
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat, OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type ScanGroupType = 'single-scan' | 'consolidated-scan' | 'deep-scan';

/**
 * Represents website scan result data.
 * Composite DB document key properties: `baseUrl`, `scanGroupId`.
 */
export interface WebsiteScanData extends StorageDocument {
    itemType: ItemType.websiteScanData;
    baseUrl: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
    // This value is immutable and is set on new db document creation.
    deepScanId?: string;
    deepScanLimit?: number;
    discoveryPatterns?: string[];
    created: string;
    reports?: WebsiteScanReport[];
    /** The unique URLs list. Supports JSON Patch Cosmos DB operation:
     * `path: '/knownPages/url', value: {}`
     * The document must have `knownPages` property to support patch operation.
     */
    knownPages?: KnownPages;
    pages?: WebsiteScanPageData[];
}

/**
 * Represents website page partial scan result data.
 * Composite DB document key properties: `websiteId`, `scanId`.
 * Partition key is inherited from corresponding `WebsiteScanData` document.
 */
export interface WebsiteScanPageData extends StorageDocument {
    itemType: ItemType.websiteScanPageData;
    websiteId: string;
    scanId: string;
    url: string;
    scanState?: ScanState;
    runState?: OnDemandPageScanRunState;
    timestamp: string;
}

/**
 * Represents known website URLs.
 * The object key property is a hash of the URL string. The Cosmos DB document patch operation will update the same property
 * hence URL with the same hash will not be duplicated.
 *
 * The estimated maximum URLs count is about 13K for the current 2 MB Cosmos DB document size limit.
 */
export interface KnownPages {
    [key: string]: { url: string };
}

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
    // This value is immutable and set on new db document creation.
    deepScanId?: string;
    discoveryPatterns?: string[];
    reports?: WebsiteScanReport[];
    runResult?: WebsiteScanRunResult;
    pageCount?: number;
    deepScanLimit?: number;
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

export interface WebsiteScanRunResult {
    completedScans: number;
    failedScans: number;
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

/**
 * The `WebsiteScanResultBase` transient keys that are not part of the stable document model.
 * The keys is not used for the documents comparison.
 */
export const websiteScanResultBaseTransientKeys = ['created', '_rid', '_ts', '_self', '_etag'];
