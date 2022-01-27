// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ItemType } from '../item-type';
import { StorageDocument } from '../storage-document';
import { WebsiteRequest, ReportGroupRequest } from '../on-demand-page-scan-batch-request';

export interface PrivacyPageScanRequest extends StorageDocument {
    itemType: ItemType.privacyPageScanRequest;
    url: string;
    configurationId: string;
    site?: WebsiteRequest;
    priority: number;
    reportGroups?: ReportGroupRequest[];
}
