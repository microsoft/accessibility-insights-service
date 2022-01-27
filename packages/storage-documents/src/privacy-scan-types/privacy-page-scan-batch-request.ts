// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfiguration } from 'service-library';
import { StorageDocument } from '../storage-document';
import { ItemType } from '../item-type';
import { ReportGroupRequest, WebsiteRequest } from '../on-demand-page-scan-batch-request';

/**
 * The client page scan run batch request document.
 */
export interface PrivacyPageScanBatchRequest extends StorageDocument {
    itemType: ItemType.privacyPageScanBatchRequest;
    scanRunBatchRequest: PrivacyScanRunBatchRequest[];
    privacyScanConfig: ServiceLibrary.PrivacyScanConfig;
}

export interface PrivacyScanRunBatchRequest {
    scanId: string;
    url: string;
    site?: WebsiteRequest;
    priority: number;
    reportGroups?: ReportGroupRequest[];
}
