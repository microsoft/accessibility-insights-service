// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat, OnDemandPageScanRunState, ScanState, ReportSource } from './on-demand-page-scan-result';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type ScanGroupType = 'single-scan' | 'group-scan' | 'deep-scan';
export declare type KnownPageSource = 'request' | 'crawler';

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
    /** This value is immutable and is set on new db document creation. */
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
 * The value is a string that compacts JSON object {@link KnownPage} in format `url|source|scanId|runState|scanState`
 * Use `convertKnownPageToString`, `convertStringToKnownPage`, and `convertObjectToKnownPages` functions to convert data.
 */
export interface KnownPages {
    [key: string]: string;
}

/**
 * Represents a known page data.
 * When stored in the Cosmos DB, the object is converted to a string and stored in the `KnownPages` object.
 * The object is converted to a string in format `url|source|scanId|runState|scanState`.
 * Use `convertKnownPageToString`, `convertStringToKnownPage`, and `convertObjectToKnownPages` functions to convert data.
 */
export interface KnownPage {
    url: string;
    source?: KnownPageSource;
    scanId?: string;
    runState?: OnDemandPageScanRunState;
    scanState?: ScanState;
}

export interface WebsiteScanReport {
    reportId: string;
    format: ReportFormat;
    source?: ReportSource;
    href: string;
}
