// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OnDemandPageScanReport, OnDemandPageScanRunResult } from './on-demand-page-scan-result';
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';

export interface ReportGeneratorRequest extends StorageDocument {
    itemType: ItemType.reportGeneratorRequest;
    scanId: string;
    scanGroupId: string;
    priority: number;
    reportsRef: OnDemandPageScanReport;
    run: OnDemandPageScanRunResult;
}
