// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { ReportFormat } from './on-demand-page-scan-result';

export interface WebsiteScanResult extends StorageDocument {
    itemType: ItemType.websiteScanResult;
    scanGroupId: string;
    baseUrl: string;
    pageScans?: PageScan[];
    reports?: WebsiteScanReport[];
}

export interface WebsiteScanReport {
    reportId: string;
    format: ReportFormat;
    href: string;
}

export interface PageScan {
    scanId: string;
    url: string;
    timestamp: string;
}
