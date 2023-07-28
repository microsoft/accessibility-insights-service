// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OnDemandPageScanReport, OnDemandPageScanRunResult } from './on-demand-page-scan-result';
import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';

export declare type TargetReport = 'accessibility' | 'privacy';
export declare type ReportScanRunState = 'pending' | 'running' | 'completed' | 'failed';

export interface ReportGeneratorRequest extends StorageDocument {
    itemType: ItemType.reportGeneratorRequest;
    scanId: string;
    scanGroupId: string;
    targetReport: TargetReport;
    priority: number;
    reports?: OnDemandPageScanReport[];
    /**
     * Supported run states: pending, running, completed, failed
     */
    run: ReportScanRunResult;
}

export interface ReportScanRunResult extends Omit<OnDemandPageScanRunResult, 'state'> {
    id?: string;
    state: ReportScanRunState;
}
