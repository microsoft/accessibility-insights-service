// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { CookieBannerType } from './on-demand-page-scan-result';
import { PageScanRequest } from './on-demand-page-scan-request';

/**
 * The client page scan run batch request document.
 */
export interface OnDemandPageScanBatchRequest extends StorageDocument {
    itemType: ItemType.scanRunBatchRequest;
    scanRunBatchRequest: ScanRunBatchRequest[];
}

export interface WebsiteRequest {
    baseUrl: string;
    knownPages?: string[];
    discoveryPatterns?: string[];
}

export interface ReportGroupRequest {
    consolidatedId: string;
}

export interface PrivacyScan {
    cookieBannerType: CookieBannerType;
}

export interface ScanRunBatchRequest extends PageScanRequest {
    scanId: string;
}
