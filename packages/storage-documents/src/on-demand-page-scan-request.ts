// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { WebsiteRequest, ReportGroupRequest, PrivacyScan } from './on-demand-page-scan-batch-request';
import { AuthenticationType, SchemaVersion, ScanType, ScanDefinition } from './on-demand-page-scan-result';

export interface PageScanRequest {
    schemaVersion?: SchemaVersion;
    url: string;
    priority: number;
    scanType?: ScanType;
    deepScan?: boolean;
    deepScanId?: string;
    site?: WebsiteRequest;
    reportGroups?: ReportGroupRequest[];
    privacyScan?: PrivacyScan;
    authenticationType?: AuthenticationType;
    scanDefinitions?: ScanDefinition[];
}

export interface OnDemandPageScanRequest extends StorageDocument, PageScanRequest {
    itemType: ItemType.onDemandPageScanRequest;
}
