// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OnDemandPageScanReport, OnDemandPageScanRunResult, WebsiteScanRef } from '../on-demand-page-scan-result';
import { ItemType } from '../item-type';
import { StorageDocument } from '../storage-document';

export interface PrivacyPageScanResult extends StorageDocument {
    itemType: ItemType.privacyScanRunResult;
    batchRequestId?: string;
    url: string;
    configurationId: string;
    websiteScanRefs?: WebsiteScanRef[];
    priority: number;
    scannedUrl?: string;
    reports?: OnDemandPageScanReport[];
    run: OnDemandPageScanRunResult;
}
