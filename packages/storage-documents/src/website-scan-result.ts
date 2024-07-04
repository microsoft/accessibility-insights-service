// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat, OnDemandPageScanRunState, ScanState } from './on-demand-page-scan-result';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type ScanGroupType = 'single-scan' | 'group-scan' | 'deep-scan';

/**
 * Represents website scan result data.
 * Composite DB document key properties: `baseUrl`, `scanGroupId`.
 */
export interface WebsiteScanData extends StorageDocument {
    itemType: ItemType.websiteScanData;
    baseUrl: string;
    scanGroupId: string;
    scanGroupType: ScanGroupType;
    created: string;
    // This value is immutable and is set on new db document creation.
    deepScanId?: string;
    deepScanLimit?: number;
    discoveryPatterns?: string[];
    reports?: WebsiteScanReport[];
    /** The unique URLs list. Supports JSON Patch Cosmos DB operation:
     * `path: '/knownPages/url', value: {}`
     * The document must have `knownPages` property to support patch operation.
     */
    knownPages?: KnownPages | KnownPage[];
}

/**
 * Stores website URLs. The URL string is hashed and used as the object key property.
 * The document PATCH operation in Cosmos DB will change that same property, so there will
 * be no repeated URLs with the same hash.
 *
 * The current 2 MB Cosmos DB document size limit allows for roughly 10K URLs in one document.
 *
 * The value is a string that compacts JSON object {@link KnownPage} in format `url|scanId|runState|scanState`
 * Use `convertKnownPageToString`, `convertStringToKnownPage`, and `convertObjectToKnownPages` functions to convert data.
 */
export interface KnownPages {
    [key: string]: string;
}

export interface KnownPage {
    url: string;
    scanId?: string;
    runState?: OnDemandPageScanRunState;
    scanState?: ScanState;
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

export const websiteScanResultBaseKeys = [
    'id',
    'itemType',
    'partitionKey',
    'itemVersion',
    '_rid',
    '_ts',
    '_self',
    '_etag',
    'itemType',
    'baseUrl',
    'scanGroupId',
    'scanGroupType',
    'deepScanId',
    'discoveryPatterns',
    'reports',
    'runResult',
    'pageCount',
    'deepScanLimit',
    'created',
];
export const websiteScanResultPartModelKeys = ['pageScans', 'knownPages'];

/**
 * The `WebsiteScanResultBase` transient keys that are not part of the stable document model.
 * The keys is not used for the documents comparison.
 */
export const websiteScanResultBaseTransientKeys = ['created', '_rid', '_ts', '_self', '_etag'];
