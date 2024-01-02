// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from './item-type';
import { StorageDocument } from './storage-document';
import { WebsiteRequest, ReportGroupRequest, PrivacyScan } from './on-demand-page-scan-batch-request';
import { AuthenticationType, ScanType } from './on-demand-page-scan-result';

export interface OnDemandPageScanRequest extends StorageDocument {
    itemType: ItemType.onDemandPageScanRequest;
    url: string;
    priority: number;
    scanType?: ScanType;
    deepScan?: boolean;
    deepScanId?: string;
    scanNotifyUrl?: string;
    site?: WebsiteRequest;
    reportGroups?: ReportGroupRequest[];
    privacyScan?: PrivacyScan;
    authenticationType?: AuthenticationType;
}
